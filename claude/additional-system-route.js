/**
 * @route GET /api/system/icecast/validate-config
 * @description Validate Icecast configuration file
 * @access Public
 */
router.get('/icecast/validate-config', async (req, res) => {
  try {
    const validation = await icecastService.validateConfiguration();
    res.json({
      success: true,
      ...validation
    });
  } catch (error) {
    console.error('Error validating Icecast configuration:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to validate Icecast configuration',
      message: error.message 
    });
  }
});

/**
 * @route GET /api/system/icecast/detect-installation  
 * @description Detect and validate Icecast installation
 * @access Public
 */
router.get('/icecast/detect-installation', async (req, res) => {
  try {
    const detection = await icecastService.searchForIcecastInstallations();
    res.json({
      success: true,
      ...detection
    });
  } catch (error) {
    console.error('Error detecting Icecast installation:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to detect Icecast installation',
      message: error.message 
    });
  }
});