/**
 * Service Model
 * Defines the structure for a registered service
 */

/**
 * Creates a valid Service object from input data
 * @param {Object} data - Input data
 * @returns {Object} Validated Service object
 */
function createService(data) {
    return {
        id: data.id || Date.now().toString(),
        name: data.name || 'Untitled Service',
        hideBackButton: typeof data.hideBackButton === 'boolean' ? data.hideBackButton : false,
        createdAt: data.createdAt || Date.now()
    };
}

module.exports = {
    createService
};
