
/**
 * Authority Hub Data Synchronization Utility
 * This script bridges the gap between the main React application's state 
 * and the legacy static HTML dashboards.
 */

window.AuthoritySync = {
    wards: [],
    lastUpdated: null,

    /**
     * Initialize synchronization
     */
    init: function() {
        console.log('🔄 Authority Hub Sync Initialized');
        this.refresh();
        
        // Refresh every 30 seconds
        setInterval(() => this.refresh(), 30000);
        
        // Listen for storage changes (in case main app updates in another tab)
        window.addEventListener('storage', (e) => {
            if (e.key === 'shared_ward_data') {
                this.refresh();
            }
        });
    },

    /**
     * Pull latest data from localStorage
     */
    refresh: function() {
        try {
            const rawData = localStorage.getItem('shared_ward_data');
            if (rawData) {
                this.wards = JSON.parse(rawData);
                this.lastUpdated = new Date();
                console.log(`✅ Synced ${this.wards.length} wards at ${this.lastUpdated.toLocaleTimeString()}`);
                
                // Trigger UI updates if the page has defined a refresh handler
                if (window.onAuthorityDataUpdate) {
                    window.onAuthorityDataUpdate(this.wards);
                }
            } else {
                console.warn('⚠️ No shared ward data found in localStorage');
            }
        } catch (err) {
            console.error('❌ Sync failed:', err);
        }
    },

    /**
     * Helper to get data for a specific ward
     */
    getWard: function(name) {
        if (!name) return null;
        const normalized = name.toUpperCase().trim();
        return this.wards.find(w => w.name.toUpperCase().trim() === normalized || normalized.includes(w.name.toUpperCase().trim()));
    },

    /**
     * Get aggregate statistics
     */
    getStats: function() {
        if (!this.wards.length) return { avgAqi: 0, severeCount: 0, severePercent: 0, totalWards: 0 };
        
        const totalAqi = this.wards.reduce((sum, w) => sum + w.aqi, 0);
        const severeCount = this.wards.filter(w => w.aqi > 200).length;
        
        return {
            avgAqi: Math.round(totalAqi / this.wards.length),
            severeCount: severeCount,
            severePercent: Math.round((severeCount / this.wards.length) * 100),
            totalWards: this.wards.length,
            criticalCount: this.wards.filter(w => w.aqi > 300).length
        };
    },

    /**
     * Helper to get color based on AQI
     */
    getAQIColor: function(aqi) {
        if (aqi <= 50) return '#00b050'; // Good
        if (aqi <= 100) return '#ffff00'; // Satisfactory
        if (aqi <= 200) return '#ff7f00'; // Moderate
        if (aqi <= 300) return '#ff0000'; // Poor
        if (aqi <= 400) return '#8b0000'; // Severe
        return '#4b0000'; // Hazardous
    }
};

// Auto-init
window.AuthoritySync.init();
