import {
    UniqueConstraintError,
    Op,
    WhereOptions,
    Order
} from 'sequelize';
import {Persona} from '../models';
import {AppError} from '../utils/app-error';

interface FiltrosPersonas {
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
    'dni',
    'fecha_nacimiento',
    'telefono'
];

export const crearPersona = async (
    datos: {
        nombre: string;
        apellido: string;
        dni: string;
        fecha_nacimiento?: Date | null;
        telefono?: string | null;
    }
) => {
    const personaExistente =
        await Persona.findOne({
            where: {
                dni: datos.dni
            }
        });

    if (personaExistente) {
        throw new AppError(
            'El DNI ya está registrado',
            409
        );
    }

    try {
        const persona =
            await Persona.create({
                nombre: datos.nombre,
                apellido: datos.apellido,
                dni: datos.dni,
                fecha_nacimiento:
                    datos.fecha_nacimiento ?? null,
                telefono:
                    datos.telefono ?? null
            });

        return persona;
    } catch (error) {
        if (error instanceof UniqueConstraintError) {
            throw new AppError(
                'El DNI ya está registrado',
                409
            );
        }

        throw error;
    }
};

export const obtenerPersona = async (id: number) => {
    const persona = await Persona.findByPk(id);

    if (!persona) {
        throw new AppError(
            'Persona no encontrada',
            404
        );
    }

    return persona;
};

export const listarPersonas = async () => {
    return await Persona.findAll({
        order: [['id', 'ASC']]
    });
};

export const listarPersonasPaginado = async (
    filtros: FiltrosPersonas
) => {
    const {
        page,
        limit,
        search,
        sortBy = 'id',
        order = 'ASC'
    } = filtros;

    const offset = (page - 1) * limit;

    const where: WhereOptions = search
        ? {
            [Op.or]: [
                {nombre: {[Op.iLike]: `%${search}%`}},
                {apellido: {[Op.iLike]: `%${search}%`}},
                {dni: {[Op.iLike]: `%${search}%`}},
                {telefono: {[Op.iLike]: `%${search}%`}}
            ]
        }
        : {};

    const campoOrden = CAMPOS_ORDENAMIENTO.includes(sortBy)
        ? sortBy
        : 'id';

    const direccion = order === 'DESC' ? 'DESC' : 'ASC';

    const ordenamiento: Order = [
        [campoOrden, direccion],
        ['id', 'ASC']
    ];

    const resultado = await Persona.findAndCountAll({
        where,
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

export const actualizarPersona = async (
    id: number,
    datos: {
        nombre: string;
        apellido: string;
        dni: string;
        fecha_nacimiento?: Date | null;
        telefono?: string | null;
    }
) => {
    const persona = await Persona.findByPk(id);

    if (!persona) {
        throw new AppError(
            'Persona no encontrada',
            404
        );
    }

    const personaExistente = await Persona.findOne({
        where: {
            dni: datos.dni
        }
    });

    if (
        personaExistente &&
        personaExistente.id !== persona.id
    ) {
        throw new AppError(
            'El DNI ya está registrado',
            409
        );
    }

    try {
        await persona.update({
            nombre: datos.nombre,
            apellido: datos.apellido,
            dni: datos.dni,
            fecha_nacimiento:
                datos.fecha_nacimiento ?? null,
            telefono:
                datos.telefono ?? null
        });
    } catch (error) {
        if (error instanceof UniqueConstraintError) {
            throw new AppError(
                'El DNI ya está registrado',
                409
            );
        }

        throw error;
    }

    return persona;
};
