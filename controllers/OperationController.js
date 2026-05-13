exports.getStatus = (req, res) => {
    const operationId = req.params.operationId;
    const operation = global.activeOperations.get(operationId);

    if (!operation) {
        return res.status(404).json({ success: false, error: 'Operation not found' });
    }

    res.json({
        success: true,
        operationId: operation.id,
        status: operation.status,
        progress: operation.progress,
        message: operation.message,
        result: operation.result,
        error: operation.error,
        timestamp: operation.timestamp
    });
};