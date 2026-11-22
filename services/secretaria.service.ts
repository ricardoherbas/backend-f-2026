import {Op, WhereOptions, Order} from 'sequelize';
import {Secretaria, Persona} from '../models';
import {DatosCrearSecretaria} from '../interfaces/secretaria.interface';
import {AppError} from '../utils/app-error';

interface FiltrosSecretarias {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
}

const CAMPOS_ORDENAMIENTO = ['id', 'nombre', 'apellido', 'dni'];

export const crearSecretaria = async (datos: DatosCrearSecretaria) => {
    const persona = await Persona.findByPk(datos.persona_id);

    if (!persona) {
        throw new AppError('La persona no existe', 404);
    }

    const secretariaExistente = await Secretaria.findOne({
        where: {persona_id: datos.persona_id}
    });

    if (secretariaExistente) {
        throw new AppError('La persona ya es secretaria', 409);
    }

    return await Secretaria.create({persona_id: datos.persona_id});
};

export const obtenerSecretaria = async (id: number) => {
    const secretaria = await Secretaria.findByPk(id, {
        include: [{
            model: Persona,
            as: 'persona',
            attributes: ['id', 'nombre', 'apellido', 'dni', 'fecha_nacimiento', 'telefono']
        }]
    });

    if (!secretaria) {
        throw new AppError('Secretaria no encontrada', 404);
    }

    return secretaria;
};

export const listarSecretarias = async () => {
    return await Secretaria.findAll({
        include: [{
            model: Persona,
            as: 'persona',
            attributes: ['id', 'nombre', 'apellido', 'dni', 'fecha_nacimiento', 'telefono']
        }],
        order: [['id', 'ASC']]
    });
};

export const listarSecretariasPaginado = async (filtros: FiltrosSecretarias) => {
    const {page, limit, search, sortBy = 'id', order = 'ASC'} = filtros;
    const offset = (page - 1) * limit;

    const wherePersona: WhereOptions | undefined = search ? {
        [Op.or]: [
            {nombre: {[Op.iLike]: `%${search}%`}},
            {apellido: {[Op.iLike]: `%${search}%`}},
            {dni: {[Op.iLike]: `%${search}%`}},
            {telefono: {[Op.iLike]: `%${search}%`}}
        ]
    } : undefined;

    const campoOrden = CAMPOS_ORDENAMIENTO.includes(sortBy) ? sortBy : 'id';
    const direccion = order === 'DESC' ? 'DESC' : 'ASC';

    const ordenamiento: Order = ['nombre', 'apellido', 'dni'].includes(campoOrden)
        ? [[{model: Persona, as: 'persona'}, campoOrden, direccion], ['id', 'ASC']]
        : [[campoOrden, direccion], ['id', 'ASC']];

    const resultado = await Secretaria.findAndCountAll({
        include: [{
            model: Persona,
            as: 'persona',
            attributes: ['id', 'nombre', 'apellido', 'dni', 'fecha_nacimiento', 'telefono'],
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

export const actualizarSecretaria = async (id: number, datos: DatosCrearSecretaria) => {
    const secretaria = await Secretaria.findByPk(id);

    if (!secretaria) {
        throw new AppError('Secretaria no encontrada', 404);
    }

    const persona = await Persona.findByPk(datos.persona_id);

    if (!persona) {
        throw new AppError('La persona no existe', 404);
    }

    const secretariaExistente = await Secretaria.findOne({
        where: {
            persona_id: datos.persona_id,
            id: {[Op.ne]: id}
        }
    });

    if (secretariaExistente) {
        throw new AppError('La persona ya es otra secretaria', 409);
    }

    await secretaria.update({persona_id: datos.persona_id});

    return await obtenerSecretaria(id);
};

export const eliminarSecretaria = async (id: number) => {
    const secretaria = await Secretaria.findByPk(id);

    if (!secretaria) {
        throw new AppError('Secretaria no encontrada', 404);
    }

    await secretaria.destroy();
};
