const express = require('express');
const router = express.Router();
const StackController = require('../controllers/StackController');

// список стеков
router.get('/', StackController.listStacks);

// информация о стеке (включая контейнеры)
router.get('/:name/info', StackController.getStackInfo);

// порты стека
router.get('/:name/ports', StackController.getStackPorts);

// запустить стек
router.post('/:name/up', StackController.startStack);

// удалить стек
router.post('/:name/delete', StackController.deleteStack);

// перезапустить стек
router.post('/:name/restart', StackController.restartStack);

// перезапустить контейнер
router.post('/containers/:id/restart', StackController.restartContainer);

module.exports = router;