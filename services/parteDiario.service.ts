import {Op, IncludeOptions, WhereOptions, Order} from 'sequelize';
import {ParteDiario, Asignacion} from '../models';
import {
    DatosCrearParteDiario,
    DatosActualizarParteDiario
} from '../interfaces/parteDiario.interface';
import {obtenerPacientesVinculados} from './vinculoFamiliar.service';
import {obtenerCuidadoraPorPersona} from './asignacion.service';
import {AppError} from '../utils/app-error';

interface FiltrosPartesDiarios {
    page: number;
    limit: number;
    search?: string;
    asignacion_id?: number;
    fecha?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    animo?: string;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
}

const CAMPOS_ORDENAMIENTO = [
    'id',
    'asignacion_id',
    'fecha',
    'animo',
    'alimentacion',
    'descanso',
    'higiene',
    'creado_en'
];

const obtenerIncludeAsignacion = async (
    personaIdFamiliar?: number,
    personaIdCuidadora?: number
): Promise<IncludeOptions> => {
    const includeAsignacion: IncludeOptions = {
        model: Asignacion,
        as: 'asignacion'
    };

    if (personaIdFamiliar !== undefined) {
        const pacienteIds = await obtenerPacientesVinculados(
            personaIdFamiliar
        );

        includeAsignacion.where = {
            paciente_id: {
                [Op.in]: pacienteIds
            }
        };

        includeAsignacion.required = true;
    }

    if (personaIdCuidadora !== undefined) {
        const cuidadora = await obtenerCuidadoraPorPersona(
            personaIdCuidadora
        );

        includeAsignacion.where = {
            cuidador_id: cuidadora.id
        };

        includeAsignacion.required = true;
    }

    return includeAsignacion;
};

export const crearParteDiario = async (
    datos: DatosCrearParteDiario,
    personaIdCuidadora?: number
) => {
    const whereAsignacion: WhereOptions<Asignacion> = {
        id: datos.asignacion_id
    };

    if (personaIdCuidadora !== undefined) {
        const cuidadora = await obtenerCuidadoraPorPersona(
            personaIdCuidadora
        );

        whereAsignacion.cuidador_id = cuidadora.id;
    }

    const asignacion = await Asignacion.findOne({
        where: whereAsignacion
    });

    if (!asignacion) {
        throw new AppError(
            'La asignación no existe o no pertenece a la cuidadora',
            404
        );
    }

    return await ParteDiario.create({
        asignacion_id: datos.asignacion_id,
        fecha: datos.fecha,
        animo: datos.animo ?? null,
        alimentacion: datos.alimentacion ?? null,
        descanso: datos.descanso ?? null,
        higiene: datos.higiene ?? null,
        novedades: datos.novedades ?? null,
        observaciones: datos.observaciones ?? null
    });
};

export const obtenerParteDiario = async (
    id: number,
    personaIdFamiliar?: number,
    personaIdCuidadora?: number
) => {
    const includeAsignacion = await obtenerIncludeAsignacion(
        personaIdFamiliar,
        personaIdCuidadora
    );

    const parte = await ParteDiario.findOne({
        where: {id},
        include: [includeAsignacion]
    });

    if (!parte) {
        throw new AppError('Parte diario no encontrado', 404);
    }

    return parte;
};

export const listarPartesDiarios = async (
    personaIdFamiliar?: number,
    personaIdCuidadora?: number
) => {
    const includeAsignacion = await obtenerIncludeAsignacion(
        personaIdFamiliar,
        personaIdCuidadora
    );

    return await ParteDiario.findAll({
        include: [includeAsignacion],
        order: [['fecha', 'DESC'], ['id', 'ASC']]
    });
};

export const listarPartesDiariosPaginado = async (
    filtros: FiltrosPartesDiarios,
    personaIdFamiliar?: number,
    personaIdCuidadora?: number
) => {
    const {
        page,
        limit,
        search,
        asignacion_id,
        fecha,
        fechaDesde,
        fechaHasta,
        animo,
        sortBy = 'fecha',
        order = 'DESC'
    } = filtros;

    const offset = (page - 1) * limit;
    const where: WhereOptions = {};

    if (asignacion_id !== undefined) {
        Object.assign(where, {asignacion_id});
    }

    if (fecha !== undefined) {
        Object.assign(where, {fecha});
    } else if (fechaDesde !== undefined || fechaHasta !== undefined) {
        const filtroFecha: {
            [Op.gte]?: string;
            [Op.lte]?: string;
        } = {};

        if (fechaDesde !== undefined) {
            filtroFecha[Op.gte] = fechaDesde;
        }

        if (fechaHasta !== undefined) {
            filtroFecha[Op.lte] = fechaHasta;
        }

        Object.assign(where, {fecha: filtroFecha});
    }

    if (animo) {
        Object.assign(where, {
            animo: {
                [Op.iLike]: `%${animo}%`
            }
        });
    }

    if (search) {
        const busqueda = `%${search}%`;

        Object.assign(where, {
            [Op.or]: [
                {animo: {[Op.iLike]: busqueda}},
                {alimentacion: {[Op.iLike]: busqueda}},
                {descanso: {[Op.iLike]: busqueda}},
                {higiene: {[Op.iLike]: busqueda}},
                {novedades: {[Op.iLike]: busqueda}},
                {observaciones: {[Op.iLike]: busqueda}}
            ]
        });
    }

    const includeAsignacion = await obtenerIncludeAsignacion(
        personaIdFamiliar,
        personaIdCuidadora
    );

    const campoOrden = CAMPOS_ORDENAMIENTO.includes(sortBy)
        ? sortBy
        : 'fecha';

    const direccion = order === 'ASC' ? 'ASC' : 'DESC';

    const ordenamiento: Order = [
        [campoOrden, direccion],
        ['id', 'ASC']
    ];

    const resultado = await ParteDiario.findAndCountAll({
        where,
        include: [includeAsignacion],
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

export const actualizarParteDiario = async (
    id: number,
    datos: DatosActualizarParteDiario,
    personaIdCuidadora?: number
) => {
    let parte;

    if (personaIdCuidadora !== undefined) {
        const cuidadora = await obtenerCuidadoraPorPersona(
            personaIdCuidadora
        );

        parte = await ParteDiario.findOne({
            where: {id},
            include: [
                {
                    model: Asignacion,
                    as: 'asignacion',
                    where: {
                        cuidador_id: cuidadora.id
                    },
                    required: true
                }
            ]
        });
    } else {
        parte = await ParteDiario.findByPk(id);
    }

    if (!parte) {
        throw new AppError(
            'Parte diario no encontrado o no pertenece a la cuidadora',
            404
        );
    }

    if (datos.asignacion_id !== undefined) {
        const whereAsignacion: WhereOptions<Asignacion> = {
            id: datos.asignacion_id
        };

        if (personaIdCuidadora !== undefined) {
            const cuidadora = await obtenerCuidadoraPorPersona(
                personaIdCuidadora
            );

            whereAsignacion.cuidador_id = cuidadora.id;
        }

        const asignacion = await Asignacion.findOne({
            where: whereAsignacion
        });

        if (!asignacion) {
            throw new AppError(
                'La asignación no existe o no pertenece a la cuidadora',
                404
            );
        }
    }

    await parte.update(datos);

    return parte;
};

export const eliminarParteDiario = async (
    id: number
) => {
    const parte = await ParteDiario.findByPk(id);

    if (!parte) {
        throw new AppError('Parte diario no encontrado', 404);
    }

    await parte.destroy();
};
