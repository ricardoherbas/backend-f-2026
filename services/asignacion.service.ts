import {Op, WhereOptions, Order, Includeable} from 'sequelize';
import {Asignacion, Turno, Cuidadora, Paciente, Persona} from '../models';
import {DatosCrearAsignacion, DatosActualizarAsignacion} from '../interfaces/asignacion.interface';
import {AppError} from '../utils/app-error';

interface FiltrosAsignaciones {
    page: number;
    limit: number;
    search?: string;
    turno_id?: number;
    cuidador_id?: number;
    paciente_id?: number;
    activo?: boolean;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
    personaIdCuidadora?: number;
}

const CAMPOS_ORDENAMIENTO = [
    'id',
    'turno_id',
    'cuidador_id',
    'paciente_id',
    'activo',
    'creado_en'
];

const validarRelaciones = async (datos: DatosCrearAsignacion): Promise<void> => {
    const turno = await Turno.findByPk(datos.turno_id);

    if (!turno) {
        throw new AppError('El turno no existe', 404);
    }

    const cuidadora = await Cuidadora.findByPk(datos.cuidador_id);

    if (!cuidadora) {
        throw new AppError('La cuidadora no existe', 404);
    }

    const paciente = await Paciente.findByPk(datos.paciente_id);

    if (!paciente) {
        throw new AppError('El paciente no existe', 404);
    }
};

const incluirRelaciones = (): Includeable[] => [
    {
        model: Turno,
        as: 'turno'
    },
    {
        model: Cuidadora,
        as: 'cuidadora',
        include: [{
            model: Persona,
            as: 'persona',
            attributes: ['id', 'nombre', 'apellido', 'dni', 'telefono']
        }]
    },
    {
        model: Paciente,
        as: 'paciente',
        include: [{
            model: Persona,
            as: 'persona',
            attributes: ['id', 'nombre', 'apellido', 'dni', 'telefono']
        }]
    }
];

export const crearAsignacion = async (datos: DatosCrearAsignacion) => {
    await validarRelaciones(datos);

    const asignacionExistente = await Asignacion.findOne({
        where: {
            turno_id: datos.turno_id,
            cuidador_id: datos.cuidador_id,
            paciente_id: datos.paciente_id
        }
    });

    if (asignacionExistente) {
        throw new AppError('La asignación ya existe', 409);
    }

    return await Asignacion.create({
        turno_id: datos.turno_id,
        cuidador_id: datos.cuidador_id,
        paciente_id: datos.paciente_id,
        activo: datos.activo ?? true
    });
};

export const obtenerCuidadoraPorPersona = async (personaId: number) => {
    const cuidadora = await Cuidadora.findOne({
        where: {persona_id: personaId}
    });

    if (!cuidadora) {
        throw new AppError('Perfil de cuidadora no encontrado', 404);
    }

    return cuidadora;
};

export const obtenerPacientesAsignados = async (
    personaIdCuidadora: number
): Promise<number[]> => {
    const cuidadora = await obtenerCuidadoraPorPersona(personaIdCuidadora);

    const asignaciones = await Asignacion.findAll({
        where: {
            cuidador_id: cuidadora.id,
            activo: true
        },
        attributes: ['paciente_id'],
        group: ['paciente_id']
    });

    return asignaciones.map(asignacion => asignacion.paciente_id);
};

export const obtenerAsignacion = async (
    id: number,
    personaIdCuidadora?: number
) => {
    const where: {
        id: number;
        cuidador_id?: number;
    } = {id};

    if (personaIdCuidadora !== undefined) {
        const cuidadora = await obtenerCuidadoraPorPersona(personaIdCuidadora);
        where.cuidador_id = cuidadora.id;
    }

    const asignacion = await Asignacion.findOne({
        where,
        include: incluirRelaciones()
    });

    if (!asignacion) {
        throw new AppError('Asignación no encontrada', 404);
    }

    return asignacion;
};

export const listarAsignaciones = async (
    personaIdCuidadora?: number
) => {
    const where: {
        cuidador_id?: number;
    } = {};

    if (personaIdCuidadora !== undefined) {
        const cuidadora = await obtenerCuidadoraPorPersona(personaIdCuidadora);
        where.cuidador_id = cuidadora.id;
    }

    return await Asignacion.findAll({
        where,
        include: incluirRelaciones(),
        order: [['id', 'ASC']]
    });
};

export const listarAsignacionesPaginado = async (
    filtros: FiltrosAsignaciones
) => {
    const {
        page,
        limit,
        search,
        turno_id,
        cuidador_id,
        paciente_id,
        activo,
        sortBy = 'id',
        order = 'ASC',
        personaIdCuidadora
    } = filtros;

    const offset = (page - 1) * limit;
    const where: WhereOptions = {};

    if (turno_id !== undefined) {
        Object.assign(where, {turno_id});
    }

    if (cuidador_id !== undefined) {
        Object.assign(where, {cuidador_id});
    }

    if (paciente_id !== undefined) {
        Object.assign(where, {paciente_id});
    }

    if (activo !== undefined) {
        Object.assign(where, {activo});
    }

    const include = incluirRelaciones();

    if (search) {
        const busqueda = `%${search}%`;

        Object.assign(where, {
            [Op.or]: [
                {'$cuidadora.persona.nombre$': {[Op.iLike]: busqueda}},
                {'$cuidadora.persona.apellido$': {[Op.iLike]: busqueda}},
                {'$cuidadora.persona.dni$': {[Op.iLike]: busqueda}},
                {'$paciente.persona.nombre$': {[Op.iLike]: busqueda}},
                {'$paciente.persona.apellido$': {[Op.iLike]: busqueda}},
                {'$paciente.persona.dni$': {[Op.iLike]: busqueda}}
            ]
        });
    }

    if (personaIdCuidadora !== undefined) {
        const cuidadora = await obtenerCuidadoraPorPersona(personaIdCuidadora);
        Object.assign(where, {cuidador_id: cuidadora.id});
    }

    const campoOrden = CAMPOS_ORDENAMIENTO.includes(sortBy)
        ? sortBy
        : 'id';

    const direccion = order === 'DESC' ? 'DESC' : 'ASC';

    const ordenamiento: Order = [
        [campoOrden, direccion],
        ['id', 'ASC']
    ];

    const resultado = await Asignacion.findAndCountAll({
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

export const actualizarAsignacion = async (
    id: number,
    datos: DatosActualizarAsignacion
) => {
    const asignacion = await Asignacion.findByPk(id);

    if (!asignacion) {
        throw new AppError('Asignación no encontrada', 404);
    }

    const datosFinales: DatosCrearAsignacion = {
        turno_id: datos.turno_id ?? asignacion.turno_id,
        cuidador_id: datos.cuidador_id ?? asignacion.cuidador_id,
        paciente_id: datos.paciente_id ?? asignacion.paciente_id,
        activo: datos.activo ?? asignacion.activo
    };

    await validarRelaciones(datosFinales);

    const asignacionExistente = await Asignacion.findOne({
        where: {
            turno_id: datosFinales.turno_id,
            cuidador_id: datosFinales.cuidador_id,
            paciente_id: datosFinales.paciente_id,
            id: {[Op.ne]: id}
        }
    });

    if (asignacionExistente) {
        throw new AppError('La asignación ya existe', 409);
    }

    await asignacion.update(datos);

    return await obtenerAsignacion(id);
};

export const eliminarAsignacion = async (id: number) => {
    const asignacion = await Asignacion.findByPk(id);

    if (!asignacion) {
        throw new AppError('Asignación no encontrada', 404);
    }

    await asignacion.destroy();
};
