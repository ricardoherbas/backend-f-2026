import {Op, WhereOptions, Order} from 'sequelize';
import {Familiar, Persona} from '../models';
import {DatosCrearFamiliar} from '../interfaces/familiar.interface';
import {AppError} from '../utils/app-error';

interface FiltrosFamiliares {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
}

const CAMPOS_ORDENAMIENTO = [
    'id',
    'nombre',
    'apellido',
    'dni'
];

export const crearFamiliar = async (
    datos: DatosCrearFamiliar
) => {
    const persona = await Persona.findByPk(datos.persona_id);

    if (!persona) {
        throw new AppError('La persona no existe', 404);
    }

    const familiarExistente = await Familiar.findOne({
        where: {persona_id: datos.persona_id}
    });

    if (familiarExistente) {
        throw new AppError('La persona ya es familiar', 409);
    }

    return await Familiar.create({
        persona_id: datos.persona_id
    });
};

export const obtenerFamiliar = async (id: number) => {
    const familiar = await Familiar.findByPk(id, {
        include: [{
            model: Persona,
            as: 'persona',
            attributes: [
                'id',
                'nombre',
                'apellido',
                'dni',
                'fecha_nacimiento',
                'telefono'
            ]
        }]
    });

    if (!familiar) {
        throw new AppError('Familiar no encontrado', 404);
    }

    return familiar;
};

/**
 * Listado original sin paginación.
 * Se conserva para mantener la compatibilidad actual.
 */
export const listarFamiliares = async () => {
    return await Familiar.findAll({
        include: [{
            model: Persona,
            as: 'persona',
            attributes: [
                'id',
                'nombre',
                'apellido',
                'dni',
                'fecha_nacimiento',
                'telefono'
            ]
        }],
        order: [['id', 'ASC']]
    });
};

/**
 * Listado paginado con búsqueda y ordenamiento.
 */
export const listarFamiliaresPaginado = async (
    filtros: FiltrosFamiliares
) => {
    const {
        page,
        limit,
        search,
        sortBy = 'id',
        order = 'ASC'
    } = filtros;

    const offset = (page - 1) * limit;

    const wherePersona: WhereOptions | undefined = search
        ? {
            [Op.or]: [
                {nombre: {[Op.iLike]: `%${search}%`}},
                {apellido: {[Op.iLike]: `%${search}%`}},
                {dni: {[Op.iLike]: `%${search}%`}},
                {telefono: {[Op.iLike]: `%${search}%`}}
            ]
        }
        : undefined;

    const campoOrden = CAMPOS_ORDENAMIENTO.includes(sortBy)
        ? sortBy
        : 'id';

    const direccion = order === 'DESC' ? 'DESC' : 'ASC';

    const ordenamiento: Order =
        ['nombre', 'apellido', 'dni'].includes(campoOrden)
            ? [
                [
                    {model: Persona, as: 'persona'},
                    campoOrden,
                    direccion
                ],
                ['id', 'ASC']
            ]
            : [
                [campoOrden, direccion],
                ['id', 'ASC']
            ];

    const resultado = await Familiar.findAndCountAll({
        include: [{
            model: Persona,
            as: 'persona',
            attributes: [
                'id',
                'nombre',
                'apellido',
                'dni',
                'fecha_nacimiento',
                'telefono'
            ],
            where: wherePersona,
            required: Boolean(wherePersona)
        }],
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

/**
 * Actualiza la persona asociada a un familiar.
 */
export const actualizarFamiliar = async (
    id: number,
    datos: DatosCrearFamiliar
) => {
    const familiar = await Familiar.findByPk(id);

    if (!familiar) {
        throw new AppError('Familiar no encontrado', 404);
    }

    const persona = await Persona.findByPk(datos.persona_id);

    if (!persona) {
        throw new AppError('La persona no existe', 404);
    }

    const familiarExistente = await Familiar.findOne({
        where: {
            persona_id: datos.persona_id,
            id: {[Op.ne]: id}
        }
    });

    if (familiarExistente) {
        throw new AppError('La persona ya es otro familiar', 409);
    }

    await familiar.update({
        persona_id: datos.persona_id
    });

    return await obtenerFamiliar(id);
};

export const eliminarFamiliar = async (id: number) => {
    const familiar = await Familiar.findByPk(id);

    if (!familiar) {
        throw new AppError('Familiar no encontrado', 404);
    }

    await familiar.destroy();
};
