import {Response, NextFunction} from 'express';
import {RequestAutenticado} from './auth.middleware';
import {Usuario} from '../models';

// La secretaria solo puede gestionar cuentas con rol "cuidadora".
// Para el administrador no restringe nada.
export const limitarSecretariaACuidadoras = async (
    req: RequestAutenticado,
    res: Response,
    next: NextFunction
): Promise<void> => {
    if (req.usuario?.rol !== 'secretaria') {
        next();
        return;
    }

    const prohibido = (): void => {
        res.status(403).json({
            mensaje: 'La secretaria solo puede gestionar usuarios con rol cuidadora'
        });
    };

    try {
        // Alta o cambio de rol: el rol enviado solo puede ser "cuidadora".
        if (req.body?.rol !== undefined && req.body.rol !== 'cuidadora') {
            prohibido();
            return;
        }

        // Operaciones sobre un usuario existente: debe ser una cuidadora.
        const id = Number(req.params.id);

        if (req.params.id !== undefined && Number.isFinite(id)) {
            const objetivo = await Usuario.findByPk(id);

            // Si no existe, el servicio responde 404.
            if (objetivo && objetivo.rol !== 'cuidadora') {
                prohibido();
                return;
            }
        }

        next();
    } catch (error) {
        next(error);
    }
};
