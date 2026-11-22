import {Op, WhereOptions, Order} from 'sequelize';
import {Paciente, Persona} from '../models';
import {
    DatosCrearPaciente,
    DatosActualizarPaciente
} from '../interfaces/paciente.interface';
import {obtenerPacientesVinculados} from './vinculoFamiliar.service';
import {obtenerPacientesAsignados} from './asignacion.service';
import {AppError} from '../utils/app-error';

interface FiltrosPacientes {
    page: number;
    limit: number;
    search?: string;
    obra_social?: string;
    activo?: boolean;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
}

const CAMPOS_ORDENAMIENTO = [
    'id',
    'nombre',
    'apellido',
    'dni',
    'obra_social',
    'activo',
    'creado_en'
];

export const crearPaciente = async (
    datos: DatosCrearPaciente
) => {
    const persona =
        await Persona.findByPk(
            datos.persona_id
        );

    if (!persona) {
        throw new AppError(
            'La persona no existe',
            404
        );
    }

    const pacienteExistente =
        await Paciente.findOne({
            where: {
                persona_id:
                    datos.persona_id
            }
        });

    if (pacienteExistente) {
        throw new AppError(
            'La persona ya es paciente',
            409
        );
    }

    const paciente =
        await Paciente.create({
            persona_id:
                datos.persona_id,
            direccion:
                datos.direccion ?? null,
            obra_social:
                datos.obra_social ?? null,
            observaciones:
                datos.observaciones ?? null,
            activo:
                true
        });

    return paciente;
};

export const obtenerPaciente = async (
    id: number,
    personaIdFamiliar?: number,
    personaIdCuidadora?: number
) => {
    if (personaIdFamiliar !== undefined) {
        const pacienteIds =
            await obtenerPacientesVinculados(
                personaIdFamiliar
            );

        if (!pacienteIds.includes(id)) {
            throw new AppError(
                'Paciente no encontrado',
                404
            );
        }
    }

    if (personaIdCuidadora !== undefined) {
        const pacienteIds =
            await obtenerPacientesAsignados(
                personaIdCuidadora
            );

        if (!pacienteIds.includes(id)) {
            throw new AppError(
                'Paciente no encontrado',
                404
            );
        }
    }

    const paciente =
        await Paciente.findByPk(
            id,
            {
                include: [
                    {
                        model: Persona,
                        as: 'persona',
                        attributes: [
                            'nombre',
                            'apellido'
                        ]
                    }
                ]
            }
        );

    if (!paciente) {
        throw new AppError(
            'Paciente no encontrado',
            404
        );
    }

    return paciente;
};

/**
 * Listado original sin paginación.
 * Se conserva para no romper los consumidores actuales.
 */
export const listarPacientes = async (
    personaIdFamiliar?: number,
    personaIdCuidadora?: number
) => {
    let where = {};

    if (personaIdFamiliar !== undefined) {
        const pacienteIds =
            await obtenerPacientesVinculados(
                personaIdFamiliar
            );

        where = {
            id: {
                [Op.in]: pacienteIds
            }
        };
    }

    if (personaIdCuidadora !== undefined) {
        const pacienteIds =
            await obtenerPacientesAsignados(
                personaIdCuidadora
            );

        where = {
            id: {
                [Op.in]: pacienteIds
            }
        };
    }

    return await Paciente.findAll({
        where,
        include: [
            {
                model: Persona,
                as: 'persona',
                attributes: [
                    'nombre',
                    'apellido'
                ]
            }
        ],
        order: [['id', 'ASC']]
    });
};

/**
 * Listado paginado con filtros y ordenamiento.
 * Conserva las restricciones de acceso por rol.
 */
export const listarPacientesPaginado = async (
    filtros: FiltrosPacientes,
    personaIdFamiliar?: number,
    personaIdCuidadora?: number
) => {
    const {
        page,
        limit,
        search,
        obra_social,
        activo,
        sortBy = 'id',
        order = 'ASC'
    } = filtros;

    const offset = (page - 1) * limit;

    // Restricciones de acceso por vínculos y asignaciones.
    const where: WhereOptions = {};

    if (personaIdFamiliar !== undefined) {
        const pacienteIds =
            await obtenerPacientesVinculados(
                personaIdFamiliar
            );

        Object.assign(where, {
            id: {
                [Op.in]: pacienteIds
            }
        });
    }

    if (personaIdCuidadora !== undefined) {
        const pacienteIds =
            await obtenerPacientesAsignados(
                personaIdCuidadora
            );

        Object.assign(where, {
            id: {
                [Op.in]: pacienteIds
            }
        });
    }

    // Filtros propios del paciente.
    if (obra_social) {
        Object.assign(where, {
            obra_social: {
                [Op.iLike]: `%${obra_social}%`
            }
        });
    }

    if (activo !== undefined) {
        Object.assign(where, {activo});
    }

    // Búsqueda en los datos de la persona asociada.
    const wherePersona = search
        ? {
            [Op.or]: [
                {
                    nombre: {
                        [Op.iLike]: `%${search}%`
                    }
                },
                {
                    apellido: {
                        [Op.iLike]: `%${search}%`
                    }
                },
                {
                    dni: {
                        [Op.iLike]: `%${search}%`
                    }
                }
            ]
        }
        : undefined;

    // Lista blanca de campos permitidos para ordenar.
    const campoOrden = CAMPOS_ORDENAMIENTO.includes(sortBy)
        ? sortBy
        : 'id';

    const direccion =
        order === 'DESC' ? 'DESC' : 'ASC';

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

    const resultado =
        await Paciente.findAndCountAll({
            where,
            include: [
                {
                    model: Persona,
                    as: 'persona',
                    attributes: [
                        'nombre',
                        'apellido',
                        'dni'
                    ],
                    where: wherePersona,
                    required: Boolean(wherePersona)
                }
            ],
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
            totalPaginas: Math.ceil(
                resultado.count / limit
            )
        }
    };
};

export const actualizarPaciente = async (
    id: number,
    datos: DatosActualizarPaciente
) => {
    const paciente =
        await Paciente.findByPk(id);

    if (!paciente) {
        throw new AppError(
            'Paciente no encontrado',
            404
        );
    }

    await paciente.update({
        direccion: datos.direccion,
        obra_social: datos.obra_social,
        observaciones: datos.observaciones,
        activo: datos.activo
    });

    return paciente;
};

export const eliminarPaciente = async (
    id: number
) => {
    const paciente =
        await Paciente.findByPk(id);

    if (!paciente) {
        throw new AppError(
            'Paciente no encontrado',
            404
        );
    }

    await paciente.destroy();
};
