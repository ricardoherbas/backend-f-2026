import {Op, Order, WhereOptions} from 'sequelize';
import {Pago, Paciente} from '../models';
import {DatosCrearPago, DatosActualizarPago} from '../interfaces/pago.interface';
import {EstadoPago} from '../types/estado-pago.type';
import {MedioPago} from '../types/medio-pago.type';
import {obtenerPacientesVinculados} from './vinculoFamiliar.service';
import {AppError} from '../utils/app-error';

interface FiltrosPagos {
    page: number;
    limit: number;
    search?: string;
    paciente_id?: number;
    estado?: EstadoPago;
    medio_pago?: MedioPago;
    periodoDesde?: string;
    periodoHasta?: string;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
}

const CAMPOS_ORDENAMIENTO = [
    'id',
    'paciente_id',
    'periodo',
    'monto',
    'fecha_pago',
    'medio_pago',
    'estado',
    'creado_en'
];

const incluirPaciente = () => [
    {
        model: Paciente,
        as: 'paciente',
        include: [
            {
                association: 'persona',
                attributes: ['id', 'nombre', 'apellido', 'dni']
            }
        ]
    }
];

const obtenerWherePorFamiliar = async (
    personaIdFamiliar?: number
): Promise<WhereOptions> => {
    if (personaIdFamiliar === undefined) {
        return {};
    }

    const pacienteIds = await obtenerPacientesVinculados(
        personaIdFamiliar
    );

    return {
        paciente_id: {
            [Op.in]: pacienteIds
        }
    };
};

export const crearPago = async (
    datos: DatosCrearPago
) => {
    const paciente = await Paciente.findByPk(datos.paciente_id);

    if (!paciente) {
        throw new AppError('El paciente no existe', 404);
    }

    const pagoExistente = await Pago.findOne({
        where: {
            paciente_id: datos.paciente_id,
            periodo: datos.periodo
        }
    });

    if (pagoExistente) {
        throw new AppError(
            'Ya existe un pago para este paciente y período',
            409
        );
    }

    return await Pago.create({
        paciente_id: datos.paciente_id,
        periodo: datos.periodo,
        monto: datos.monto,
        fecha_pago: datos.fecha_pago ?? null,
        medio_pago: datos.medio_pago ?? null,
        observaciones: datos.observaciones ?? null,
        estado: datos.estado ?? 'pendiente'
    });
};

export const obtenerPago = async (
    id: number,
    personaIdFamiliar?: number
) => {
    const where = await obtenerWherePorFamiliar(personaIdFamiliar);

    Object.assign(where, {id});

    const pago = await Pago.findOne({
        where,
        include: incluirPaciente()
    });

    if (!pago) {
        throw new AppError('Pago no encontrado', 404);
    }

    return pago;
};

export const listarPagos = async (
    personaIdFamiliar?: number
) => {
    const where = await obtenerWherePorFamiliar(personaIdFamiliar);

    return await Pago.findAll({
        where,
        include: incluirPaciente(),
        order: [['periodo', 'DESC'], ['id', 'ASC']]
    });
};

export const listarPagosPaginado = async (
    filtros: FiltrosPagos,
    personaIdFamiliar?: number
) => {
    const {
        page,
        limit,
        search,
        paciente_id,
        estado,
        medio_pago,
        periodoDesde,
        periodoHasta,
        sortBy = 'periodo',
        order = 'DESC'
    } = filtros;

    const offset = (page - 1) * limit;

    // Se conserva el alcance del familiar aunque se envíe un filtro
    // por paciente desde la URL.
    const condiciones: WhereOptions[] = [
        await obtenerWherePorFamiliar(personaIdFamiliar)
    ];

    if (paciente_id !== undefined) {
        condiciones.push({paciente_id});
    }

    if (estado !== undefined) {
        condiciones.push({estado});
    }

    if (medio_pago !== undefined) {
        condiciones.push({medio_pago});
    }

    if (periodoDesde !== undefined || periodoHasta !== undefined) {
        const filtroPeriodo: {
            [Op.gte]?: string;
            [Op.lte]?: string;
        } = {};

        if (periodoDesde !== undefined) {
            filtroPeriodo[Op.gte] = periodoDesde;
        }

        if (periodoHasta !== undefined) {
            filtroPeriodo[Op.lte] = periodoHasta;
        }

        condiciones.push({periodo: filtroPeriodo});
    }

    if (search) {
        const busqueda = `%${search}%`;

        condiciones.push({
            [Op.or]: [
                {observaciones: {[Op.iLike]: busqueda}},
                {'$paciente.persona.nombre$': {[Op.iLike]: busqueda}},
                {'$paciente.persona.apellido$': {[Op.iLike]: busqueda}},
                {'$paciente.persona.dni$': {[Op.iLike]: busqueda}}
            ]
        });
    }

    const campoOrden = CAMPOS_ORDENAMIENTO.includes(sortBy)
        ? sortBy
        : 'periodo';

    const direccion = order === 'ASC' ? 'ASC' : 'DESC';

    const ordenamiento: Order = [
        [campoOrden, direccion],
        ['id', 'ASC']
    ];

    const resultado = await Pago.findAndCountAll({
        where: {
            [Op.and]: condiciones
        },
        include: incluirPaciente(),
        distinct: true,
        limit,
        offset,
        order: ordenamiento
    });

    return {
        datos: resultado.rows,
        paginacion: {
            pagina: page,
            limite: limit,
            total: resultado.count,
            totalPaginas: Math.ceil(resultado.count / limit)
        }
    };
};

export const actualizarPago = async (
    id: number,
    datos: DatosActualizarPago
) => {
    const pago = await Pago.findByPk(id);

    if (!pago) {
        throw new AppError('Pago no encontrado', 404);
    }

    const pacienteId = datos.paciente_id ?? pago.paciente_id;
    const periodo = datos.periodo ?? pago.periodo;

    if (datos.paciente_id !== undefined) {
        const paciente = await Paciente.findByPk(datos.paciente_id);

        if (!paciente) {
            throw new AppError('El paciente no existe', 404);
        }
    }

    const pagoExistente = await Pago.findOne({
        where: {
            paciente_id: pacienteId,
            periodo,
            id: {
                [Op.ne]: id
            }
        }
    });

    if (pagoExistente) {
        throw new AppError(
            'Ya existe un pago para este paciente y período',
            409
        );
    }

    await pago.update(datos);

    return pago;
};

export const eliminarPago = async (
    id: number
) => {
    const pago = await Pago.findByPk(id);

    if (!pago) {
        throw new AppError('Pago no encontrado', 404);
    }

    await pago.destroy();
};
