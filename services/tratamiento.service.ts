import {Op, Order, WhereOptions} from 'sequelize';
import {Tratamiento, Paciente, Medicamento} from '../models';
import {
    DatosCrearTratamiento,
    DatosActualizarTratamiento
} from '../interfaces/tratamiento.interface';
import {AppError} from '../utils/app-error';
import {obtenerPacientesVinculados} from './vinculoFamiliar.service';
import {obtenerPacientesAsignados} from './asignacion.service';

interface FiltrosTratamientos {
    page: number;
    limit: number;
    search?: string;
    paciente_id?: number;
    medicamento_id?: number;
    activa?: boolean;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
}

const CAMPOS_ORDENAMIENTO = [
    'id',
    'paciente_id',
    'medicamento_id',
    'dosis',
    'frecuencia',
    'desde',
    'hasta',
    'activa',
    'creado_en'
];

const incluirRelaciones = () => [
    {
        model: Paciente,
        as: 'paciente',
        include: [
            {
                association: 'persona',
                attributes: ['id', 'nombre', 'apellido', 'dni']
            }
        ]
    },
    {
        model: Medicamento,
        as: 'medicamento'
    }
];

const obtenerWherePorUsuario = async (
    personaIdFamiliar?: number,
    personaIdCuidadora?: number
): Promise<WhereOptions> => {
    const where: WhereOptions = {};

    if (personaIdFamiliar !== undefined) {
        const pacienteIds = await obtenerPacientesVinculados(
            personaIdFamiliar
        );

        Object.assign(where, {
            paciente_id: {
                [Op.in]: pacienteIds
            }
        });
    }

    if (personaIdCuidadora !== undefined) {
        const pacienteIds = await obtenerPacientesAsignados(
            personaIdCuidadora
        );

        Object.assign(where, {
            paciente_id: {
                [Op.in]: pacienteIds
            }
        });
    }

    return where;
};

export const crearTratamiento = async (
    datos: DatosCrearTratamiento
) => {
    const paciente = await Paciente.findByPk(datos.paciente_id);

    if (!paciente) {
        throw new AppError('El paciente no existe', 404);
    }

    const medicamento = await Medicamento.findByPk(datos.medicamento_id);

    if (!medicamento) {
        throw new AppError('El medicamento no existe', 404);
    }

    return await Tratamiento.create({
        paciente_id: datos.paciente_id,
        medicamento_id: datos.medicamento_id,
        dosis: datos.dosis,
        frecuencia: datos.frecuencia,
        horario: datos.horario ?? null,
        desde: datos.desde ?? null,
        hasta: datos.hasta ?? null,
        activa: datos.activa ?? true
    });
};

export const obtenerTratamiento = async (
    id: number,
    personaIdFamiliar?: number,
    personaIdCuidadora?: number
) => {
    const where = await obtenerWherePorUsuario(
        personaIdFamiliar,
        personaIdCuidadora
    );

    Object.assign(where, {id});

    const tratamiento = await Tratamiento.findOne({
        where,
        include: incluirRelaciones()
    });

    if (!tratamiento) {
        throw new AppError('Tratamiento no encontrado', 404);
    }

    return tratamiento;
};

export const listarTratamientos = async (
    personaIdFamiliar?: number,
    personaIdCuidadora?: number
) => {
    const where = await obtenerWherePorUsuario(
        personaIdFamiliar,
        personaIdCuidadora
    );

    return await Tratamiento.findAll({
        where,
        include: incluirRelaciones(),
        order: [['id', 'ASC']]
    });
};

export const listarTratamientosPaginado = async (
    filtros: FiltrosTratamientos,
    personaIdFamiliar?: number,
    personaIdCuidadora?: number
) => {
    const {
        page,
        limit,
        search,
        paciente_id,
        medicamento_id,
        activa,
        sortBy = 'id',
        order = 'ASC'
    } = filtros;

    const offset = (page - 1) * limit;

    const where = await obtenerWherePorUsuario(
        personaIdFamiliar,
        personaIdCuidadora
    );

    if (paciente_id !== undefined) {
        Object.assign(where, {paciente_id});
    }

    if (medicamento_id !== undefined) {
        Object.assign(where, {medicamento_id});
    }

    if (activa !== undefined) {
        Object.assign(where, {activa});
    }

    if (search) {
        const busqueda = `%${search}%`;

        Object.assign(where, {
            [Op.or]: [
                {dosis: {[Op.iLike]: busqueda}},
                {frecuencia: {[Op.iLike]: busqueda}},
                {'$medicamento.nombre$': {[Op.iLike]: busqueda}},
                {'$paciente.persona.nombre$': {[Op.iLike]: busqueda}},
                {'$paciente.persona.apellido$': {[Op.iLike]: busqueda}},
                {'$paciente.persona.dni$': {[Op.iLike]: busqueda}}
            ]
        });
    }

    const campoOrden = CAMPOS_ORDENAMIENTO.includes(sortBy)
        ? sortBy
        : 'id';

    const direccion = order === 'DESC' ? 'DESC' : 'ASC';

    const ordenamiento: Order = [
        [campoOrden, direccion],
        ['id', 'ASC']
    ];

    const resultado = await Tratamiento.findAndCountAll({
        where,
        include: incluirRelaciones(),
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

export const actualizarTratamiento = async (
    id: number,
    datos: DatosActualizarTratamiento
) => {
    const tratamiento = await Tratamiento.findByPk(id);

    if (!tratamiento) {
        throw new AppError('Tratamiento no encontrado', 404);
    }

    if (datos.paciente_id !== undefined) {
        const paciente = await Paciente.findByPk(datos.paciente_id);

        if (!paciente) {
            throw new AppError('El paciente no existe', 404);
        }
    }

    if (datos.medicamento_id !== undefined) {
        const medicamento = await Medicamento.findByPk(datos.medicamento_id);

        if (!medicamento) {
            throw new AppError('El medicamento no existe', 404);
        }
    }

    await tratamiento.update(datos);

    return tratamiento;
};

export const eliminarTratamiento = async (
    id: number
) => {
    const tratamiento = await Tratamiento.findByPk(id);

    if (!tratamiento) {
        throw new AppError('Tratamiento no encontrado', 404);
    }

    await tratamiento.destroy();
};
