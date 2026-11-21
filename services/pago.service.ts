import {Op, Includeable} from 'sequelize';
import {Pago, Paciente, Persona} from '../models';
import {DatosCrearPago, DatosActualizarPago} from '../interfaces/pago.interface';
import {obtenerPacientesVinculados} from './vinculoFamiliar.service';
import {AppError} from '../utils/app-error';
import {escaparLike, paginar, ordenar, respuestaPaginada} from '../utils/listado';
import {generarXlsx} from '../utils/exportar-xlsx';

export const crearPago = async (
    datos: DatosCrearPago
) => {
    const paciente =
        await Paciente.findByPk(
            datos.paciente_id
        );

    if (!paciente) {
        throw new AppError(
            'El paciente no existe',
            404
        );
    }

    const pagoExistente =
        await Pago.findOne({
            where: {
                paciente_id:
                    datos.paciente_id,
                periodo:
                    datos.periodo
            }
        });

    if (pagoExistente) {
        throw new AppError(
            'Ya existe un pago para este paciente y período',
            409
        );
    }

    const pago =
        await Pago.create({
            paciente_id:
                datos.paciente_id,
            periodo:
                datos.periodo,
            monto:
                datos.monto,
            fecha_pago:
                datos.fecha_pago ?? null,
            medio_pago:
                datos.medio_pago ?? null,
            observaciones:
                datos.observaciones ?? null,
            estado:
                datos.estado ?? 'pendiente'
        });

    return pago;
};

export const obtenerPago = async (
    id: number,
    personaIdFamiliar?: number
) => {
    const where: {
        id: number;
        paciente_id?: {
            [Op.in]: number[];
        };
    } = {id};

    if (personaIdFamiliar !== undefined) {
        const pacienteIds =
            await obtenerPacientesVinculados(
                personaIdFamiliar
            );

        where.paciente_id = {
            [Op.in]: pacienteIds
        };
    }

    const pago =
        await Pago.findOne({
            where,
            include: [
                {
                    model: Paciente,
                    as: 'paciente',
                    include: [
                        {
                            model: Persona,
                            as: 'persona'
                        }
                    ]
                }
            ]
        });

    if (!pago) {
        throw new AppError(
            'Pago no encontrado',
            404
        );
    }

    return pago;
};

const CAMPOS_ORDENABLES = [
    'id', 'periodo', 'monto', 'fecha_pago', 'estado', 'medio_pago', 'creado_en'
] as const;
const ESTADOS = ['pendiente', 'pagado', 'vencido'];
const MEDIOS = ['efectivo', 'tarjeta', 'transferencia', 'qr', 'obra_social'];

export interface FiltrosPagos {
    busqueda?: string;
    estado?: string;
    medio_pago?: string;
    paciente_id?: number;
    periodo_desde?: string;
    periodo_hasta?: string;
}

export interface ParametrosListadoPagos extends FiltrosPagos {
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: string;
}

const construirConsulta = async (
    filtros: FiltrosPagos,
    personaIdFamiliar?: number
) => {
    const where: Record<string, unknown> = {};

    // El familiar solo puede ver pagos de sus pacientes vinculados
    if (personaIdFamiliar !== undefined) {
        const pacienteIds =
            await obtenerPacientesVinculados(personaIdFamiliar);

        if (filtros.paciente_id !== undefined) {
            where.paciente_id = pacienteIds.includes(filtros.paciente_id)
                ? filtros.paciente_id
                : {[Op.in]: []};
        } else {
            where.paciente_id = {[Op.in]: pacienteIds};
        }
    } else if (filtros.paciente_id !== undefined) {
        where.paciente_id = filtros.paciente_id;
    }

    if (filtros.estado) {
        if (!ESTADOS.includes(filtros.estado)) {
            throw new AppError('El estado no es válido', 400);
        }
        where.estado = filtros.estado;
    }

    if (filtros.medio_pago) {
        if (!MEDIOS.includes(filtros.medio_pago)) {
            throw new AppError('El medio de pago no es válido', 400);
        }
        where.medio_pago = filtros.medio_pago;
    }

    const rangoPeriodo: Record<symbol, string> = {};
    if (filtros.periodo_desde) {
        if (Number.isNaN(Date.parse(filtros.periodo_desde))) {
            throw new AppError('periodo_desde no es válido', 400);
        }
        rangoPeriodo[Op.gte] = filtros.periodo_desde;
    }
    if (filtros.periodo_hasta) {
        if (Number.isNaN(Date.parse(filtros.periodo_hasta))) {
            throw new AppError('periodo_hasta no es válido', 400);
        }
        rangoPeriodo[Op.lte] = filtros.periodo_hasta;
    }
    if (Reflect.ownKeys(rangoPeriodo).length > 0) {
        where.periodo = rangoPeriodo;
    }

    // Búsqueda por nombre, apellido o DNI del paciente (join paciente → persona)
    const termino = filtros.busqueda
        ? `%${escaparLike(filtros.busqueda)}%`
        : undefined;

    const include: Includeable[] = [
        {
            model: Paciente,
            as: 'paciente',
            required: termino !== undefined,
            include: [
                {
                    model: Persona,
                    as: 'persona',
                    required: termino !== undefined,
                    ...(termino
                        ? {
                              where: {
                                  [Op.or]: [
                                      {nombre: {[Op.iLike]: termino}},
                                      {apellido: {[Op.iLike]: termino}},
                                      {dni: {[Op.iLike]: termino}}
                                  ]
                              }
                          }
                        : {})
                }
            ]
        }
    ];

    return {where, include};
};

export const listarPagos = async (
    params: ParametrosListadoPagos = {},
    personaIdFamiliar?: number
) => {
    const {page, limit, offset} = paginar(params.page, params.limit);
    const [campo, sentido] = ordenar(
        params.sortBy,
        params.order,
        CAMPOS_ORDENABLES,
        'id'
    );
    const {where, include} = await construirConsulta(
        params,
        personaIdFamiliar
    );

    const {rows, count} = await Pago.findAndCountAll({
        where,
        include,
        order: [[campo, sentido], ['id', 'ASC']],
        limit,
        offset,
        distinct: true
    });

    return respuestaPaginada(rows, count, page, limit);
};

type PagoConPaciente = Pago & {
    paciente?: {persona?: {nombre: string; apellido: string}};
};

export const generarReportePagos = async (
    filtros: FiltrosPagos = {},
    personaIdFamiliar?: number
): Promise<Buffer> => {
    const {where, include} = await construirConsulta(
        filtros,
        personaIdFamiliar
    );

    const pagos = (await Pago.findAll({
        where,
        include,
        order: [['periodo', 'DESC'], ['id', 'ASC']],
        limit: 10000
    })) as PagoConPaciente[];

    const filas = pagos.map((p) => {
        const persona = p.paciente?.persona;

        return {
            id: p.id,
            paciente: persona
                ? `${persona.apellido}, ${persona.nombre}`
                : `Paciente #${p.paciente_id}`,
            periodo: String(p.periodo),
            monto: Number(p.monto),
            estado: p.estado,
            medio_pago: p.medio_pago ?? '',
            fecha_pago: p.fecha_pago ? String(p.fecha_pago) : '',
            observaciones: p.observaciones ?? ''
        };
    });

    return generarXlsx(
        'Pagos',
        [
            {encabezado: 'ID', clave: 'id', ancho: 8},
            {encabezado: 'Paciente', clave: 'paciente', ancho: 30},
            {encabezado: 'Período', clave: 'periodo', ancho: 14},
            {encabezado: 'Monto', clave: 'monto', ancho: 14},
            {encabezado: 'Estado', clave: 'estado', ancho: 12},
            {encabezado: 'Medio de pago', clave: 'medio_pago', ancho: 16},
            {encabezado: 'Fecha de pago', clave: 'fecha_pago', ancho: 14},
            {encabezado: 'Observaciones', clave: 'observaciones', ancho: 40}
        ],
        filas
    );
};

export const actualizarPago = async (
    id: number,
    datos: DatosActualizarPago
) => {
    const pago =
        await Pago.findByPk(id);

    if (!pago) {
        throw new AppError(
            'Pago no encontrado',
            404
        );
    }

    if (datos.paciente_id !== undefined) {
        const paciente =
            await Paciente.findByPk(
                datos.paciente_id
            );

        if (!paciente) {
            throw new AppError(
                'El paciente no existe',
                404
            );
        }
    }

    await pago.update(datos);

    return pago;
};

export const eliminarPago = async (
    id: number
) => {
    const pago =
        await Pago.findByPk(id);

    if (!pago) {
        throw new AppError(
            'Pago no encontrado',
            404
        );
    }

    await pago.destroy();
};