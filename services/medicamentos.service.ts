import {Op, Order, WhereOptions} from 'sequelize';
import {Medicamento} from '../models';
import {DatosCrearMedicamento, DatosActualizarMedicamento} from '../interfaces/medicamento.interface';
import {AppError} from '../utils/app-error';

interface FiltrosMedicamentos {
    page: number;
    limit: number;
    search?: string;
    cantidad?: number;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
}

const CAMPOS_ORDENAMIENTO = [
    'id',
    'nombre',
    'presentacion',
    'cantidad'
];

export const crearMedicamento = async (
    datos: DatosCrearMedicamento
) => {
    return await Medicamento.create({
        nombre: datos.nombre,
        presentacion: datos.presentacion,
        cantidad: datos.cantidad
    });
};

export const obtenerMedicamento = async (
    id: number
) => {
    const medicamento = await Medicamento.findByPk(id);

    if (!medicamento) {
        throw new AppError('Medicamento no encontrado', 404);
    }

    return medicamento;
};

export const listarMedicamentos = async () => {
    return await Medicamento.findAll({
        order: [['id', 'ASC']]
    });
};

export const listarMedicamentosPaginado = async (
    filtros: FiltrosMedicamentos
) => {
    const {
        page,
        limit,
        search,
        cantidad,
        sortBy = 'id',
        order = 'ASC'
    } = filtros;

    const offset = (page - 1) * limit;
    const where: WhereOptions = {};

    if (cantidad !== undefined) {
        Object.assign(where, {cantidad});
    }

    if (search) {
        Object.assign(where, {
            [Op.or]: [
                {nombre: {[Op.iLike]: `%${search}%`}},
                {presentacion: {[Op.iLike]: `%${search}%`}}
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

    const resultado = await Medicamento.findAndCountAll({
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

export const actualizarMedicamento = async (
    id: number,
    datos: DatosActualizarMedicamento
) => {
    const medicamento = await Medicamento.findByPk(id);

    if (!medicamento) {
        throw new AppError('Medicamento no encontrado', 404);
    }

    await medicamento.update(datos);

    return medicamento;
};

export const eliminarMedicamento = async (
    id: number
) => {
    const medicamento = await Medicamento.findByPk(id);

    if (!medicamento) {
        throw new AppError('Medicamento no encontrado', 404);
    }

    await medicamento.destroy();
};
