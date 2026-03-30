const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth.middleware');
const AiCache = require('../models/AiCache');
const Application = require('../models/Application');

// @desc    Clear all AI cache entries
// @route   POST /api/admin/clear-cache
// @access  Admin only
router.post('/clear-cache', auth, authorize(['admin']), async (req, res) => {
    try {
        const result = await AiCache.deleteMany({});
        const appResetResult = await Application.updateMany(
            {},
            {
                $set: {
                    aiScore: null,
                    aiFeedback: null,
                    aiPros: [],
                    aiCons: [],
                    aiAnalysis: null
                }
            }
        );
        res.json({
            message: 'All AI cache and application analysis data cleared successfully',
            cacheEntriesDeleted: result.deletedCount,
            applicationsReset: appResetResult.modifiedCount
        });
    } catch (err) {
        console.error('Error clearing cache:', err.message);
        res.status(500).json({ message: 'Server error while clearing cache' });
    }
});

// @desc    Get cache statistics
// @route   GET /api/admin/cache-stats
// @access  Admin only
router.get('/cache-stats', auth, authorize(['admin']), async (req, res) => {
    try {
        const totalCount = await AiCache.countDocuments();
        const byType = await AiCache.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]);

        const oldestEntry = await AiCache.findOne().sort({ createdAt: 1 }).lean();
        const newestEntry = await AiCache.findOne().sort({ createdAt: -1 }).lean();

        res.json({
            totalCount,
            byType: byType.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            oldestAge: oldestEntry ? new Date(oldestEntry.createdAt) : null,
            newestAge: newestEntry ? new Date(newestEntry.createdAt) : null
        });
    } catch (err) {
        console.error('Error fetching cache stats:', err.message);
        res.status(500).json({ message: 'Server error while fetching cache stats' });
    }
});

// @desc    Clear cache by type
// @route   POST /api/admin/clear-cache/:type
// @access  Admin only
router.post('/clear-cache/:type', auth, authorize(['admin']), async (req, res) => {
    try {
        const { type } = req.params;
        const validTypes = ['analyze-resume', 'match-resume', 'application-analyze'];
        
        if (!validTypes.includes(type)) {
            return res.status(400).json({ 
                message: `Invalid cache type. Must be one of: ${validTypes.join(', ')}` 
            });
        }

        const result = await AiCache.deleteMany({ type });
        let applicationsReset = 0;

        // Both 'match-resume' and 'application-analyze' persist onto Application docs, so reset those too
        if (type === 'match-resume' || type === 'application-analyze') {
            const appResetResult = await Application.updateMany(
                {},
                {
                    $set: {
                        aiScore: null,
                        aiFeedback: null,
                        aiPros: [],
                        aiCons: [],
                        aiAnalysis: null
                    }
                }
            );
            applicationsReset = appResetResult.modifiedCount;
        }

        res.json({
            message: `AI cache of type '${type}' and related application data cleared successfully`,
            cacheEntriesDeleted: result.deletedCount,
            applicationsReset: applicationsReset
        });
    } catch (err) {
        console.error('Error clearing cache:', err.message);
        res.status(500).json({ message: 'Server error while clearing cache' });
    }
});

module.exports = router;
