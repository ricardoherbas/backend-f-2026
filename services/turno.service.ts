import {Op, WhereOptions, Order, Includeable, cast, col, where as sequelizeWhere} from 'sequelize';
import {Turno, Asignacion} from '../models';
import {
    DatosCrearTurno,
    DatosActualizarTurno
} from '../interfaces/turno.interface';
import {AppError} from '../utils/app-error';
import {obtenerCuidadoraPorPersona} from './asignacion.service';

interface FiltrosTurnos {
    page: number;
    limit: number;
    search?: string;
    dia_semana?: string;
    activo?: boolean;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
    personaIdCuidadora?: number;
}

const CAMPOS_ORDENAMIENTO = [
    'id',
    'dia_semana',
    'hora_inicio',
    'hora_fin',
    'activo',
    'creado_en'
];

export const crearTurno = async (datos: DatosCrearTurno) => {
    return await Turno.create({
        dia_semana: datos.dia_semana,
        hora_inicio: datos.hora_inicio,
        hora_fin: datos.hora_fin,
        activo: datos.activo ?? true
    });
};

export const obtenerTurno = async (id: number, personaIdCuidadora?: number) => {
    let turno;

    if (personaIdCuidadora !== undefined) {
        const cuidadora = await obtenerCuidadoraPorPersona(personaIdCuidadora);

        turno = await Turno.findOne({
            where: {id},
            include: [{
                model: Asignacion,
                as: 'asignaciones',
                attributes: [],
                where: {
                    cuidador_id: cuidadora.id,
                    activo: true
                },
                required: true
            }]
        });
    } else {
        turno = await Turno.findByPk(id);
    }

    if (!turno) {
        throw new AppError('Turno no encontrado', 404);
    }

    return turno;
};

export const listarTurnos = async (personaIdCuidadora?: number) => {
    if (personaIdCuidadora !== undefined) {
        const cuidadora = await obtenerCuidadoraPorPersona(personaIdCuidadora);

        return await Turno.findAll({
            include: [{
                model: Asignacion,
                as: 'asignaciones',
                attributes: [],
                where: {
                    cuidador_id: cuidadora.id,
                    activo: true
                },
                required: true
            }],
            order: [['id', 'ASC']]
        });
    }

    return await Turno.findAll({
        order: [['id', 'ASC']]
    });
};

export const listarTurnosPaginado = async (filtros: FiltrosTurnos) => {
    const {
        page,
        limit,
        search,
        dia_semana,
        activo,
        sortBy = 'id',
        order = 'ASC',
        personaIdCuidadora
    } = filtros;

    const offset = (page - 1) * limit;

    const where: WhereOptions = {};

    if (dia_semana) {
        Object.assign(where, {dia_semana});
    }

    if (activo !== undefined) {
        Object.assign(where, {activo});
    }

    if (search) {
        const busqueda = `%${search}%`;

        Object.assign(where, {
            [Op.or]: [
                {dia_semana: {[Op.iLike]: busqueda}},
                sequelizeWhere(cast(col('hora_inicio'), 'text'), {
                    [Op.iLike]: busqueda
                }),
                sequelizeWhere(cast(col('hora_fin'), 'text'), {
                    [Op.iLike]: busqueda
                })
            ]
        });
    }

    const campoOrden = CAMPOS_ORDENAMIENTO.includes(sortBy) ? sortBy : 'id';
    const direccion = order === 'DESC' ? 'DESC' : 'ASC';

    const ordenamiento: Order = [
        [campoOrden, direccion],
        ['id', 'ASC']
    ];

    const include: Includeable[] = [];

    if (personaIdCuidadora !== undefined) {
        const cuidadora = await obtenerCuidadoraPorPersona(personaIdCuidadora);

        include.push({
            model: Asignacion,
            as: 'asignaciones',
            attributes: [],
            where: {
                cuidador_id: cuidadora.id,
                activo: true
            },
            required: true
        });
    }

    const resultado = await Turno.findAndCountAll({
        where,
        include,
        limit,
        offset,
        order: ordenamiento,
        distinct: true
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

export const actualizarTurno = async (id: number, datos: DatosActualizarTurno) => {
    const turno = await Turno.findByPk(id);

    if (!turno) {
        throw new AppError('Turno no encontrado', 404);
    }

    await turno.update(datos);

    return turno;
};

export const eliminarTurno = async (id: number) => {
    const turno = await Turno.findByPk(id);

    if (!turno) {
        throw new AppError('Turno no encontrado', 404);
    }

    await turno.destroy();
};
