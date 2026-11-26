import {Request, Response, NextFunction} from 'express';

export const validarCuidadora = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const {persona_id} = req.body;

    if (!Number.isInteger(persona_id) || persona_id <= 0) {
        res.status(400).json({
            mensaje: 'persona_id debe ser un número entero válido'
        });
        return;
    }

    next();
};

export const validarCrearCuidadora = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const {persona_id, email, password} = req.body;

    if (!Number.isInteger(persona_id) || persona_id <= 0) {
        res.status(400).json({
            mensaje: 'persona_id debe ser un número entero válido'
        });
        return;
    }

    if (
        !email ||
        typeof email !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        res.status(400).json({
            mensaje: 'Debe proporcionar un email válido'
        });
        return;
    }

    if (
        !password ||
        typeof password !== 'string' ||
        password.length < 8
    ) {
        res.status(400).json({
            mensaje: 'La contraseña debe tener al menos 8 caracteres'
        });
        return;
    }

    next();
};
