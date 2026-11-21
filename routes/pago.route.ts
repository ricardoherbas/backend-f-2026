import {Router} from 'express';
import {crear, obtener, listar, reporte, actualizar, eliminar} from '../controllers/pago.controller';
import {verificarToken} from '../middlewares/auth.middleware';
import {verificarRol} from '../middlewares/rol.middleware';
import {validarPago} from '../validators/pago.validator';

const router = Router();

router.post('/', verificarToken, verificarRol('administrador', 'secretaria'), validarPago, crear);
router.get('/', verificarToken, verificarRol('administrador', 'secretaria', 'familiar'), listar);
// /reporte tiene que ir antes de /:id, si no Express lo toma como un ID
router.get('/reporte', verificarToken, verificarRol('administrador', 'secretaria', 'familiar'), reporte);
router.get('/:id', verificarToken, verificarRol('administrador', 'secretaria', 'familiar'), obtener);
router.put('/:id', verificarToken, verificarRol('administrador', 'secretaria'), validarPago, actualizar);
router.delete('/:id', verificarToken, verificarRol('administrador'), eliminar);

export default router;