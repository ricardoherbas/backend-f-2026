import {Op, WhereOptions, Order} from 'sequelize';
import {Cuidadora, Persona} from '../models';
import {DatosCrearCuidadora} from '../interfaces/cuidadora.interface';
import {AppError} from '../utils/app-error';

interface FiltrosCuidadoras {
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

export const crearCuidadora = async (
    datos: DatosCrearCuidadora
) => {
    const persona = await Persona.findByPk(datos.persona_id);

    if (!persona) {
        throw new AppError('La persona no existe', 404);
    }

    const cuidadoraExistente = await Cuidadora.findOne({
        where: {persona_id: datos.persona_id}
    });

    if (cuidadoraExistente) {
        throw new AppError('La persona ya es cuidadora', 409);
    }

    return await Cuidadora.create({
        persona_id: datos.persona_id
    });
};

export const obtenerCuidadora = async (id: number) => {
    const cuidadora = await Cuidadora.findByPk(id, {
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

    if (!cuidadora) {
        throw new AppError('Cuidadora no encontrada', 404);
    }

    return cuidadora;
};

/**
 * Listado original sin paginación.
 * Se conserva para mantener la compatibilidad actual.
 */
export const listarCuidadoras = async () => {
    return await Cuidadora.findAll({
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
export const listarCuidadorasPaginado = async (
    filtros: FiltrosCuidadoras
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

    const resultado = await Cuidadora.findAndCountAll({
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
 * Actualiza la persona asociada a una cuidadora.
 */
export const actualizarCuidadora = async (
    id: number,
    datos: DatosCrearCuidadora
) => {
    const cuidadora = await Cuidadora.findByPk(id);

    if (!cuidadora) {
        throw new AppError('Cuidadora no encontrada', 404);
    }

    const persona = await Persona.findByPk(datos.persona_id);

    if (!persona) {
        throw new AppError('La persona no existe', 404);
    }

    const cuidadoraExistente = await Cuidadora.findOne({
        where: {
            persona_id: datos.persona_id,
            id: {[Op.ne]: id}
        }
    });

    if (cuidadoraExistente) {
        throw new AppError('La persona ya es otra cuidadora', 409);
    }

    await cuidadora.update({
        persona_id: datos.persona_id
    });

    return await obtenerCuidadora(id);
};

export const eliminarCuidadora = async (id: number) => {
    const cuidadora = await Cuidadora.findByPk(id);

    if (!cuidadora) {
        throw new AppError('Cuidadora no encontrada', 404);
    }

    await cuidadora.destroy();
};
