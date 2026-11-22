import {Request, Response, NextFunction} from 'express';
import {RequestAutenticado} from '../middlewares/auth.middleware';
import {
    crearPaciente,
    obtenerPaciente,
    listarPacientes,
    listarPacientesPaginado,
    actualizarPaciente,
    eliminarPaciente
} from '../services/paciente.service';

export const crear = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const paciente =
            await crearPaciente(req.body);

        res.status(201).json({
            mensaje: 'Paciente creado correctamente',
            paciente
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

        const paciente =
            await obtenerPaciente(
                id,
                personaIdFamiliar,
                personaIdCuidadora
            );

        res.status(200).json(paciente);
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

        const solicitaPaginacion =
            req.query.page !== undefined ||
            req.query.limit !== undefined;

        if (!solicitaPaginacion) {
            const pacientes =
                await listarPacientes(
                    personaIdFamiliar,
                    personaIdCuidadora
                );

            res.status(200).json(pacientes);
            return;
        }

        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 10);

        if (
            !Number.isInteger(page) ||
            page < 1 ||
            !Number.isInteger(limit) ||
            limit < 1
        ) {
            res.status(400).json({
                mensaje: 'Los parámetros page y limit deben ser enteros positivos'
            });
            return;
        }

        if (limit > 100) {
            res.status(400).json({
                mensaje: 'El límite máximo de registros por página es 100'
            });
            return;
        }

        const activoQuery = req.query.activo;

        let activo: boolean | undefined;

        if (activoQuery !== undefined) {
            if (
                activoQuery !== 'true' &&
                activoQuery !== 'false'
            ) {
                res.status(400).json({
                    mensaje: 'El parámetro activo debe ser true o false'
                });
                return;
            }

            activo = activoQuery === 'true';
        }

        const orderQuery =
            String(req.query.order ?? 'ASC').toUpperCase();

        if (
            orderQuery !== 'ASC' &&
            orderQuery !== 'DESC'
        ) {
            res.status(400).json({
                mensaje: 'El parámetro order debe ser ASC o DESC'
            });
            return;
        }

        const resultado =
            await listarPacientesPaginado(
                {
                    page,
                    limit,
                    search: req.query.search
                        ? String(req.query.search).trim()
                        : undefined,
                    obra_social: req.query.obra_social
                        ? String(req.query.obra_social).trim()
                        : undefined,
                    activo,
                    sortBy: req.query.sortBy
                        ? String(req.query.sortBy)
                        : 'id',
                    order: orderQuery
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
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = Number(req.params.id);

        const paciente =
            await actualizarPaciente(
                id,
                req.body
            );

        res.status(200).json({
            mensaje: 'Paciente actualizado correctamente',
            paciente
        });
    } catch (error) {
        next(error);
    }
};

export const eliminar = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = Number(req.params.id);

        await eliminarPaciente(id);

        res.status(200).json({
            mensaje: 'Paciente eliminado correctamente'
        });
    } catch (error) {
        next(error);
    }
};
