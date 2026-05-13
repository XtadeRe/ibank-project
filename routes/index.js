const express = require('express');
const router = express.Router();

const healthRoutes = require('./health');
const stackRoutes = require('./stacks');
const operationRoutes = require('./operations');
const branchDataRoutes = require('./branch-data');

router.use('/health', healthRoutes);
router.use('/stacks', stackRoutes);
router.use('/operations', operationRoutes);
router.use('/branch-data', branchDataRoutes);

module.exports = router;