import {Request, Response, NextFunction} from 'express';
import {
    crearMedicamento,
    obtenerMedicamento,
    listarMedicamentos,
    listarMedicamentosPaginado,
    actualizarMedicamento,
    eliminarMedicamento
} from '../services/medicamentos.service';

export const crear = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const medicamento = await crearMedicamento(req.body);

        res.status(201).json({
            mensaje: 'Medicamento creado correctamente',
            medicamento
        });
    } catch (error) {
        next(error);
    }
};

export const obtener = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const medicamento = await obtenerMedicamento(id);

        res.status(200).json(medicamento);
    } catch (error) {
        next(error);
    }
};

export const listar = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {
            page,
            limit,
            search,
            cantidad,
            sortBy,
            order
        } = req.query;

        if (page === undefined && limit === undefined) {
            const medicamentos = await listarMedicamentos();

            res.status(200).json(medicamentos);
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

        let filtroCantidad: number | undefined;

        if (cantidad !== undefined) {
            filtroCantidad = Number(cantidad);

            if (
                !Number.isInteger(filtroCantidad) ||
                filtroCantidad <= 0
            ) {
                res.status(400).json({
                    mensaje: 'El parámetro cantidad debe ser un entero mayor que cero'
                });
                return;
            }
        }

        const resultado = await listarMedicamentosPaginado({
            page: pagina,
            limit: limite,
            search: search ? String(search).trim() : undefined,
            cantidad: filtroCantidad,
            sortBy: sortBy ? String(sortBy) : 'id',
            order: direccion as 'ASC' | 'DESC'
        });

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

        const medicamento = await actualizarMedicamento(
            id,
            req.body
        );

        res.status(200).json({
            mensaje: 'Medicamento actualizado correctamente',
            medicamento
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

        await eliminarMedicamento(id);

        res.status(200).json({
            mensaje: 'Medicamento eliminado correctamente'
        });
    } catch (error) {
        next(error);
    }
};
