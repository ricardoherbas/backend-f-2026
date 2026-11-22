import {Response, NextFunction} from 'express';
import {RequestAutenticado} from '../middlewares/auth.middleware';
import {
    crearTratamiento,
    obtenerTratamiento,
    listarTratamientos,
    listarTratamientosPaginado,
    actualizarTratamiento,
    eliminarTratamiento
} from '../services/tratamiento.service';

export const crear = async (
    req: RequestAutenticado,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const tratamiento = await crearTratamiento(req.body);

        res.status(201).json({
            mensaje: 'Tratamiento creado correctamente',
            tratamiento
        });
    } catch (error) {
        next(error);
    }
};

export const obtener = async (
    req: RequestAutenticado,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = Number(req.params.id);

        const personaIdFamiliar =
            req.usuario?.rol === 'familiar'
                ? req.usuario.persona_id
                : undefined;

        const personaIdCuidadora =
            req.usuario?.rol === 'cuidadora'
                ? req.usuario.persona_id
                : undefined;

        const tratamiento = await obtenerTratamiento(
            id,
            personaIdFamiliar,
            personaIdCuidadora
        );

        res.status(200).json(tratamiento);
    } catch (error) {
        next(error);
    }
};

export const listar = async (
    req: RequestAutenticado,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const personaIdFamiliar =
            req.usuario?.rol === 'familiar'
                ? req.usuario.persona_id
                : undefined;

        const personaIdCuidadora =
            req.usuario?.rol === 'cuidadora'
                ? req.usuario.persona_id
                : undefined;

        const {
            page,
            limit,
            search,
            paciente_id,
            medicamento_id,
            activa,
            sortBy,
            order
        } = req.query;

        if (page === undefined && limit === undefined) {
            const tratamientos = await listarTratamientos(
                personaIdFamiliar,
                personaIdCuidadora
            );

            res.status(200).json(tratamientos);
            return;
        }

        const pagina = Number(page ?? 1);
        const limite = Number(limit ?? 10);

        if (
            !Number.isInteger(pagina) ||
            pagina <= 0 ||
            !Number.isInteger(limite) ||
            limite <= 0 ||
            limite > 100
        ) {
            res.status(400).json({
                mensaje: 'Los parámetros page y limit deben ser enteros positivos. El límite máximo es 100'
            });
            return;
        }

        const direccion = String(order ?? 'ASC').toUpperCase();

        if (!['ASC', 'DESC'].includes(direccion)) {
            res.status(400).json({
                mensaje: 'El parámetro order debe ser ASC o DESC'
            });
            return;
        }

        const pacienteId = paciente_id !== undefined
            ? Number(paciente_id)
            : undefined;

        const medicamentoId = medicamento_id !== undefined
            ? Number(medicamento_id)
            : undefined;

        if (
            pacienteId !== undefined &&
            (!Number.isInteger(pacienteId) || pacienteId <= 0)
        ) {
            res.status(400).json({
                mensaje: 'paciente_id debe ser un entero positivo'
            });
            return;
        }

        if (
            medicamentoId !== undefined &&
            (!Number.isInteger(medicamentoId) || medicamentoId <= 0)
        ) {
            res.status(400).json({
                mensaje: 'medicamento_id debe ser un entero positivo'
            });
            return;
        }

        let filtroActiva: boolean | undefined;

        if (activa !== undefined) {
            const valor = String(activa).toLowerCase();

            if (valor !== 'true' && valor !== 'false') {
                res.status(400).json({
                    mensaje: 'El parámetro activa debe ser true o false'
                });
                return;
            }

            filtroActiva = valor === 'true';
        }

        const resultado = await listarTratamientosPaginado(
            {
                page: pagina,
                limit: limite,
                search: search ? String(search).trim() : undefined,
                paciente_id: pacienteId,
                medicamento_id: medicamentoId,
                activa: filtroActiva,
                sortBy: sortBy ? String(sortBy) : 'id',
                order: direccion as 'ASC' | 'DESC'
            },
            personaIdFamiliar,
            personaIdCuidadora
        );

        res.status(200).json(resultado);
    } catch (error) {
        next(error);
    }
};

export const actualizar = async (
    req: RequestAutenticado,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = Number(req.params.id);

        const tratamiento = await actualizarTratamiento(
            id,
            req.body
        );

        res.status(200).json({
            mensaje: 'Tratamiento actualizado correctamente',
            tratamiento
        });
    } catch (error) {
        next(error);
    }
};

export const eliminar = async (
    req: RequestAutenticado,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = Number(req.params.id);

        await eliminarTratamiento(id);

        res.status(200).json({
            mensaje: 'Tratamiento eliminado correctamente'
        });
    } catch (error) {
        next(error);
    }
};
