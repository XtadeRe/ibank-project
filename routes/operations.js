const express = require('express');
const router = express.Router();
const OperationController = require('../controllers/OperationController');

router.get('/:operationId/status', OperationController.getStatus);

module.exports = router;