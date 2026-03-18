const { Monitoring } = require('@google-cloud/monitoring');
const { Logging } = require('@google-cloud/logging');
const axios = require('axios');

/**
 * INSTITUTIONAL-GRADE MONITORING AND ALERTING ENGINE
 * Implements enterprise monitoring, alerting, and observability
 */
class InstitutionalMonitoringEngine {
  constructor() {
    this.projectId = process.env.GCP_PROJECT_ID || 'alpha-orion';
    this.monitoring = new Monitoring({ projectId: this.projectId });
    this.logging = new Logging({ projectId: this.projectId });
    this.log = this.logging.log('institutional-monitoring');

    this.alerts = new Map();
    this.metrics = new Map();
    this.incidents = [];
    this.slos = new Map();

    // Alert thresholds
    this.thresholds = {
      system: {
        cpuUsage: 85, // 85% CPU usage
        memoryUsage: 90, // 90% memory usage
        diskUsage: 95, // 95% disk usage
        responseTime: 5000, // 5 seconds response time
        errorRate: 0.05 // 5% error rate
      },
      trading: {
        failedTrades: 5, // 5 failed trades per hour
        slippage: 0.03, // 3% slippage threshold
        latency: 2000, // 2 seconds trade latency
        successRate: 0.95 // 95% success rate
      },
      risk: {
        varBreach: 0.05, // 5% VaR breach
        drawdown: 0.10, // 10% drawdown
        leverage: 3.0, // 3x leverage limit
        concentration: 0.25 // 25% concentration
      },
      compliance: {
        pendingKYC: 100, // 100 pending KYC verifications
        amlAlerts: 10, // 10 AML alerts per day
        sanctionsHits: 1, // Any sanctions hits
        regulatoryBreaches: 0 // Zero tolerance
      }
    };

    // SLO definitions
    this.defineSLOs();

    console.log('[InstitutionalMonitoringEngine] Initialized enterprise monitoring system');
  }

  /**
   * Define Service Level Objectives
   */
  defineSLOs() {
    this.slos.set('api_availability', {
      name: 'API Availability',
      target: 0.9995, // 99.95% uptime
      window: '30d',
      metric: 'api/uptime'
    });

    this.slos.set('trade_success_rate', {
      name: 'Trade Success Rate',
      target: 0.995, // 99.5% success rate
      window: '7d',
      metric: 'trading/success_rate'
    });

    this.slos.set('risk_compliance', {
      name: 'Risk Compliance',
      target: 0.999, // 99.9% compliance
      window: '30d',
      metric: 'risk/compliance_rate'
    });

    this.slos.set('response_time', {
      name: 'API Response Time',
      target: 2000, // 2 seconds average
      window: '1h',
      metric: 'api/response_time'
    });
  }

  /**
   * Record custom metric
   */
  async recordMetric(name, value, labels = {}) {
    const metricType = `custom.googleapis.com/${name}`;

    const dataPoint = {
      interval: {
        endTime: {
          seconds: Math.floor(Date.now() / 1000),
        },
      },
      value: {
        doubleValue: value,
      },
    };

    const timeSeriesData = {
      timeSeriesDescriptor: {
        metricDescriptor: {
          type: metricType,
          metricKind: 'GAUGE',
          valueType: 'DOUBLE',
          labels: Object.keys(labels).map(key => ({
            key,
            valueType: 'STRING',
            description: `${key} label`
          }))
        },
        resource: {
          type: 'global',
        },
        metricLabels: labels
      },
      timeSeries: [{
        points: [dataPoint],
      }],
    };

    try {
      await this.monitoring.createTimeSeries({
        name: this.monitoring.projectPath(this.projectId),
        timeSeries: [timeSeriesData.timeSeries],
      });

      // Store locally for quick access
      this.metrics.set(name, {
        value,
        timestamp: Date.now(),
        labels
      });

    } catch (error) {
      console.error(`[MonitoringEngine] Failed to record metric ${name}:`, error);
    }
  }

  /**
   * Create alert
   */
  async createAlert(alertId, title, description, severity = 'WARNING', labels = {}) {
    const alert = {
      id: alertId,
      title,
      description,
      severity,
      status: 'OPEN',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      labels,
      incidents: []
    };

    this.alerts.set(alertId, alert);

    // Log alert
    await this.logAlert('ALERT_CREATED', alert);

    // Send notifications based on severity
    await this.sendAlertNotifications(alert);

    return alert;
  }

  /**
   * Update alert status
   */
  async updateAlert(alertId, status, resolution = null) {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    alert.status = status;
    alert.updated = new Date().toISOString();

    if (resolution) {
      alert.resolution = resolution;
    }

    // Log update
    await this.logAlert('ALERT_UPDATED', alert);

    return alert;
  }

  /**
   * Trigger an immediate, on-demand check for a specific metric.
   * This allows other services to report critical events for instant alerting.
   * @param {string} metricName - The name of the metric (e.g., 'trading/slippage').
   * @param {number} value - The current value of the metric.
   * @param {object} labels - Optional labels for the metric.
   */
  async triggerImmediateCheck(metricName, value, labels = {}) {
    console.log(`[MonitoringEngine] Immediate check triggered for ${metricName} with value ${value}`);
    await this.recordMetric(metricName, value, labels);

    // Find the relevant check function and execute it immediately
    if (metricName.startsWith('system/')) await this.checkSystemHealth();
    else if (metricName.startsWith('trading/')) await this.checkTradingPerformance();
    else if (metricName.startsWith('risk/')) await this.checkRiskMetrics();
    else if (metricName.startsWith('compliance/')) await this.checkComplianceMetrics();

    // Note: SLO checks remain on their scheduled interval.
  }

  /**
   * Check thresholds and create alerts
   */
  async checkThresholds() {
    const checks = [
      this.checkSystemHealth(),
      this.checkTradingPerformance(),
      this.checkRiskMetrics(),
      this.checkComplianceMetrics(),
      this.checkSLOMetrics()
    ];

    const results = await Promise.all(checks);

    for (const result of results) {
      if (result.alerts && result.alerts.length > 0) {
        for (const alert of result.alerts) {
          await this.createAlert(
            alert.id,
            alert.title,
            alert.description,
            alert.severity,
            alert.labels
          );
        }
      }
    }
  }

  /**
   * Check system health metrics
   */
  async checkSystemHealth() {
    const alerts = [];

    try {
      // CPU usage check
      const cpuMetric = this.metrics.get('system/cpu_usage');
      if (cpuMetric && cpuMetric.value > this.thresholds.system.cpuUsage) {
        alerts.push({
          id: `cpu-high-${Date.now()}`,
          title: 'High CPU Usage',
          description: `CPU usage is ${cpuMetric.value.toFixed(1)}%, exceeding threshold of ${this.thresholds.system.cpuUsage}%`,
          severity: cpuMetric.value > 95 ? 'CRITICAL' : 'WARNING',
          labels: { component: 'system', metric: 'cpu' }
        });
      }

      // Memory usage check
      const memoryMetric = this.metrics.get('system/memory_usage');
      if (memoryMetric && memoryMetric.value > this.thresholds.system.memoryUsage) {
        alerts.push({
          id: `memory-high-${Date.now()}`,
          title: 'High Memory Usage',
          description: `Memory usage is ${memoryMetric.value.toFixed(1)}%, exceeding threshold of ${this.thresholds.system.memoryUsage}%`,
          severity: memoryMetric.value > 95 ? 'CRITICAL' : 'WARNING',
          labels: { component: 'system', metric: 'memory' }
        });
      }

      // Response time check
      const responseTimeMetric = this.metrics.get('api/response_time');
      if (responseTimeMetric && responseTimeMetric.value > this.thresholds.system.responseTime) {
        alerts.push({
          id: `response-time-high-${Date.now()}`,
          title: 'High API Response Time',
          description: `Average response time is ${responseTimeMetric.value}ms, exceeding threshold of ${this.thresholds.system.responseTime}ms`,
          severity: 'WARNING',
          labels: { component: 'api', metric: 'response_time' }
        });
      }

    } catch (error) {
      console.error('[MonitoringEngine] System health check error:', error);
    }

    return { alerts };
  }

  /**
   * Check trading performance metrics
   */
  async checkTradingPerformance() {
    const alerts = [];

    try {
      // Failed trades check
      const failedTradesMetric = this.metrics.get('trading/failed_trades');
      if (failedTradesMetric && failedTradesMetric.value > this.thresholds.trading.failedTrades) {
        alerts.push({
          id: `failed-trades-high-${Date.now()}`,
          title: 'High Failed Trade Rate',
          description: `${failedTradesMetric.value} trades failed in the last hour, exceeding threshold of ${this.thresholds.trading.failedTrades}`,
          severity: 'CRITICAL',
          labels: { component: 'trading', metric: 'failed_trades' }
        });
      }

      // Success rate check
      const successRateMetric = this.metrics.get('trading/success_rate');
      if (successRateMetric && successRateMetric.value < this.thresholds.trading.successRate) {
        alerts.push({
          id: `success-rate-low-${Date.now()}`,
          title: 'Low Trade Success Rate',
          description: `Trade success rate is ${(successRateMetric.value * 100).toFixed(1)}%, below threshold of ${(this.thresholds.trading.successRate * 100)}%`,
          severity: 'CRITICAL',
          labels: { component: 'trading', metric: 'success_rate' }
        });
      }

      // Slippage check
      const slippageMetric = this.metrics.get('trading/slippage');
      if (slippageMetric && slippageMetric.value > this.thresholds.trading.slippage) {
        alerts.push({
          id: `slippage-high-${Date.now()}`,
          title: 'High Trading Slippage',
          description: `Average slippage is ${(slippageMetric.value * 100).toFixed(2)}%, exceeding threshold of ${(this.thresholds.trading.slippage * 100)}%`,
          severity: 'WARNING',
          labels: { component: 'trading', metric: 'slippage' }
        });
      }

    } catch (error) {
      console.error('[MonitoringEngine] Trading performance check error:', error);
    }

    return { alerts };
  }

  /**
   * Check risk metrics
   */
  async checkRiskMetrics() {
    const alerts = [];

    try {
      // VaR breach check
      const varMetric = this.metrics.get('risk/value_at_risk');
      if (varMetric && varMetric.value > this.thresholds.risk.varBreach) {
        alerts.push({
          id: `var-breach-${Date.now()}`,
          title: 'VaR Limit Breach',
          description: `Value at Risk is ${(varMetric.value * 100).toFixed(2)}%, exceeding limit of ${(this.thresholds.risk.varBreach * 100)}%`,
          severity: 'CRITICAL',
          labels: { component: 'risk', metric: 'var' }
        });
      }

      // Drawdown check
      const drawdownMetric = this.metrics.get('risk/drawdown');
      if (drawdownMetric && drawdownMetric.value > this.thresholds.risk.drawdown) {
        alerts.push({
          id: `drawdown-high-${Date.now()}`,
          title: 'High Portfolio Drawdown',
          description: `Portfolio drawdown is ${(drawdownMetric.value * 100).toFixed(2)}%, exceeding threshold of ${(this.thresholds.risk.drawdown * 100)}%`,
          severity: 'CRITICAL',
          labels: { component: 'risk', metric: 'drawdown' }
        });
      }

      // Leverage check
      const leverageMetric = this.metrics.get('risk/leverage');
      if (leverageMetric && leverageMetric.value > this.thresholds.risk.leverage) {
        alerts.push({
          id: `leverage-high-${Date.now()}`,
          title: 'High Leverage Ratio',
          description: `Portfolio leverage is ${leverageMetric.value.toFixed(2)}x, exceeding limit of ${this.thresholds.risk.leverage}x`,
          severity: 'WARNING',
          labels: { component: 'risk', metric: 'leverage' }
        });
      }

    } catch (error) {
      console.error('[MonitoringEngine] Risk metrics check error:', error);
    }

    return { alerts };
  }

  /**
   * Check compliance metrics
   */
  async checkComplianceMetrics() {
    const alerts = [];

    try {
      // Pending KYC check
      const pendingKYCMetric = this.metrics.get('compliance/pending_kyc');
      if (pendingKYCMetric && pendingKYCMetric.value > this.thresholds.compliance.pendingKYC) {
        alerts.push({
          id: `pending-kyc-high-${Date.now()}`,
          title: 'High Pending KYC Queue',
          description: `${pendingKYCMetric.value} KYC verifications are pending, exceeding threshold of ${this.thresholds.compliance.pendingKYC}`,
          severity: 'WARNING',
          labels: { component: 'compliance', metric: 'kyc' }
        });
      }

      // AML alerts check
      const amlAlertsMetric = this.metrics.get('compliance/aml_alerts');
      if (amlAlertsMetric && amlAlertsMetric.value > this.thresholds.compliance.amlAlerts) {
        alerts.push({
          id: `aml-alerts-high-${Date.now()}`,
          title: 'High AML Alert Volume',
          description: `${amlAlertsMetric.value} AML alerts generated today, exceeding threshold of ${this.thresholds.compliance.amlAlerts}`,
          severity: 'CRITICAL',
          labels: { component: 'compliance', metric: 'aml' }
        });
      }

      // Sanctions hits check
      const sanctionsHitsMetric = this.metrics.get('compliance/sanctions_hits');
      if (sanctionsHitsMetric && sanctionsHitsMetric.value > this.thresholds.compliance.sanctionsHits) {
        alerts.push({
          id: `sanctions-hit-${Date.now()}`,
          title: 'Sanctions List Match',
          description: `${sanctionsHitsMetric.value} sanctions list matches detected`,
          severity: 'CRITICAL',
          labels: { component: 'compliance', metric: 'sanctions' }
        });
      }

    } catch (error) {
      console.error('[MonitoringEngine] Compliance metrics check error:', error);
    }

    return { alerts };
  }

  /**
   * Check SLO compliance
   */
  async checkSLOMetrics() {
    const alerts = [];

    for (const [sloKey, slo] of this.slos) {
      try {
        const metric = this.metrics.get(slo.metric);
        if (!metric) continue;

        const sloBreach = this.checkSLOBreach(slo, metric.value);

        if (sloBreach.isBreached) {
          alerts.push({
            id: `slo-breach-${sloKey}-${Date.now()}`,
            title: `SLO Breach: ${slo.name}`,
            description: `${slo.name} is ${sloBreach.deviation.toFixed(2)}% below target of ${(slo.target * 100).toFixed(2)}%`,
            severity: sloBreach.severity,
            labels: { component: 'slo', slo: sloKey }
          });
        }
      } catch (error) {
        console.error(`[MonitoringEngine] SLO check error for ${sloKey}:`, error);
      }
    }

    return { alerts };
  }

  /**
   * Check if SLO is breached
   */
  checkSLOBreach(slo, currentValue) {
    let targetValue;
    let isHigherBetter = true;

    switch (slo.metric) {
      case 'api/uptime':
      case 'trading/success_rate':
      case 'risk/compliance_rate':
        targetValue = slo.target;
        break;
      case 'api/response_time':
        targetValue = slo.target;
        isHigherBetter = false;
        break;
      default:
        return { isBreached: false };
    }

    const deviation = isHigherBetter ?
      ((targetValue - currentValue) / targetValue) * 100 :
      ((currentValue - targetValue) / targetValue) * 100;

    const isBreached = deviation > 5; // 5% deviation threshold
    const severity = deviation > 15 ? 'CRITICAL' : deviation > 10 ? 'WARNING' : 'INFO';

    return {
      isBreached,
      deviation,
      severity,
      targetValue,
      currentValue
    };
  }

  /**
   * Send alert notifications
   */
  async sendAlertNotifications(alert) {
    const { severity, title, description, id } = alert;
    const message = `*${severity} Alert*: ${title}\n*Description*: ${description}\n*Alert ID*: ${id}`;

    // Route notifications based on severity
    if (severity === 'CRITICAL') {
      // Send to PagerDuty to wake someone up
      await this.sendToPagerDuty(alert);
      // Also send to the critical alerts Slack channel
      await this.sendToSlack(process.env.SLACK_CRITICAL_CHANNEL_WEBHOOK, message);
    } else if (severity === 'WARNING') {
      // Send to the general alerts Slack channel
      await this.sendToSlack(process.env.SLACK_WARNING_CHANNEL_WEBHOOK, message);
    } else {
      // For INFO, just log it (already done in createAlert)
      console.log(`[MonitoringEngine] INFO alert logged: ${title}`);
    }
  }

  /**
   * Simulate sending a notification to a Slack webhook.
   * @param {string} webhookUrl - The Slack webhook URL.
   * @param {string} message - The message to send.
   */
  async sendToSlack(webhookUrl, message) {
    if (!webhookUrl) {
      console.log(`[MonitoringEngine] Slack notification (simulation):\n${message}`);
      return;
    }
    try {
      await axios.post(webhookUrl, { text: message });
      console.log(`[MonitoringEngine] Successfully sent alert to Slack.`);
    } catch (error) {
      console.error(`[MonitoringEngine] Failed to send Slack notification: ${error.message}`);
    }
  }

  /**
   * Simulate sending an event to PagerDuty.
   * @param {object} alert - The alert object.
   */
  async sendToPagerDuty(alert) {
    const routingKey = process.env.PAGERDUTY_ROUTING_KEY;
    if (!routingKey) {
      console.log(`[MonitoringEngine] PagerDuty event (simulation) for alert: ${alert.title}`);
      return;
    }
    try {
      // This is a simplified PagerDuty v2 event payload
      await axios.post('https://events.pagerduty.com/v2/enqueue', {
        routing_key: routingKey,
        event_action: 'trigger',
        payload: {
          summary: alert.title,
          source: 'alpha-orion-monitoring',
          severity: 'critical',
          custom_details: alert,
        },
      });
      console.log(`[MonitoringEngine] Successfully triggered PagerDuty incident.`);
    } catch (error) {
      console.error(`[MonitoringEngine] Failed to trigger PagerDuty incident: ${error.message}`);
    }
  }

  /**
   * Create incident from alert
   */
  async createIncident(alertId, description, priority = 'P2') {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    const incident = {
      id: `INC-${Date.now()}`,
      alertId,
      title: alert.title,
      description: description || alert.description,
      priority,
      status: 'OPEN',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      assignee: null,
      timeline: [{
        timestamp: new Date().toISOString(),
        action: 'INCIDENT_CREATED',
        user: 'SYSTEM',
        description: 'Incident automatically created from alert'
      }]
    };

    this.incidents.push(incident);

    // Update alert
    alert.incidents.push(incident.id);

    // Log incident
    await this.logIncident('INCIDENT_CREATED', incident);

    return incident;
  }

  /**
   * Update incident
   */
  async updateIncident(incidentId, updates) {
    const incident = this.incidents.find(inc => inc.id === incidentId);
    if (!incident) return null;

    Object.assign(incident, updates);
    incident.updated = new Date().toISOString();

    // Add timeline entry
    incident.timeline.push({
      timestamp: new Date().toISOString(),
      action: 'INCIDENT_UPDATED',
      user: updates.user || 'SYSTEM',
      description: updates.description || 'Incident updated'
    });

    // Log update
    await this.logIncident('INCIDENT_UPDATED', incident);

    return incident;
  }

  /**
   * Get system health dashboard
   */
  getHealthDashboard() {
    const now = Date.now();
    const lastHour = now - (60 * 60 * 1000);
    const last24Hours = now - (24 * 60 * 60 * 1000);

    // Calculate metrics
    const recentAlerts = Array.from(this.alerts.values())
      .filter(alert => new Date(alert.created) > new Date(lastHour));

    const criticalAlerts = recentAlerts.filter(alert => alert.severity === 'CRITICAL');
    const openIncidents = this.incidents.filter(inc => inc.status === 'OPEN');

    // SLO status
    const sloStatus = {};
    for (const [sloKey, slo] of this.slos) {
      const metric = this.metrics.get(slo.metric);
      if (metric) {
        const breach = this.checkSLOBreach(slo, metric.value);
        sloStatus[sloKey] = {
          name: slo.name,
          target: slo.target,
          current: metric.value,
          status: breach.isBreached ? 'BREACHED' : 'COMPLIANT',
          deviation: breach.deviation
        };
      }
    }

    return {
      timestamp: new Date().toISOString(),
      systemStatus: this.determineOverallStatus(),
      metrics: {
        totalAlerts: this.alerts.size,
        recentAlerts: recentAlerts.length,
        criticalAlerts: criticalAlerts.length,
        openIncidents: openIncidents.length,
        activeSLOs: Object.keys(sloStatus).length
      },
      sloStatus,
      topAlerts: recentAlerts.slice(0, 10),
      recentIncidents: openIncidents.slice(0, 5)
    };
  }

  /**
   * Determine overall system status
   */
  determineOverallStatus() {
    const criticalAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.severity === 'CRITICAL' && alert.status === 'OPEN');

    const breachedSLOs = Array.from(this.slos.values())
      .filter(slo => {
        const metric = this.metrics.get(slo.metric);
        if (!metric) return false;
        const breach = this.checkSLOBreach(slo, metric.value);
        return breach.isBreached;
      });

    if (criticalAlerts.length > 0 || breachedSLOs.length > 0) {
      return 'CRITICAL';
    }

    const warningAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.severity === 'WARNING' && alert.status === 'OPEN');

    if (warningAlerts.length > 5) {
      return 'WARNING';
    }

    return 'HEALTHY';
  }

  /**
   * Log alert event
   */
  async logAlert(eventType, alert) {
    const entry = this.log.entry({
      severity: alert.severity === 'CRITICAL' ? 'CRITICAL' :
               alert.severity === 'WARNING' ? 'WARNING' : 'INFO',
      resource: { type: 'global' },
      labels: { component: 'monitoring', alert_id: alert.id }
    }, {
      message: `${eventType}: ${alert.title}`,
      alert: alert,
      timestamp: new Date().toISOString()
    });

    await this.log.write(entry);
  }

  /**
   * Log incident event
   */
  async logIncident(eventType, incident) {
    const entry = this.log.entry({
      severity: incident.priority === 'P1' ? 'CRITICAL' :
               incident.priority === 'P2' ? 'WARNING' : 'INFO',
      resource: { type: 'global' },
      labels: { component: 'incident', incident_id: incident.id }
    }, {
      message: `${eventType}: ${incident.title}`,
      incident: incident,
      timestamp: new Date().toISOString()
    });

    await this.log.write(entry);
  }

  /**
   * Generate monitoring report
   */
  generateReport(timeRange = '24h') {
    const now = new Date();
    const startTime = new Date(now.getTime() - this.parseTimeRange(timeRange));

    const report = {
      period: timeRange,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      summary: {
        totalAlerts: this.alerts.size,
        activeAlerts: Array.from(this.alerts.values()).filter(a => a.status === 'OPEN').length,
        totalIncidents: this.incidents.length,
        activeIncidents: this.incidents.filter(i => i.status === 'OPEN').length,
        systemStatus: this.determineOverallStatus()
      },
      alerts: {
        bySeverity: this.groupAlertsBySeverity(),
        byComponent: this.groupAlertsByComponent(),
        recent: this.getRecentAlerts(50)
      },
      incidents: {
        byPriority: this.groupIncidentsByPriority(),
        resolutionTime: this.calculateAverageResolutionTime(),
        recent: this.getRecentIncidents(20)
      },
      slos: this.getSLOStatus(),
      recommendations: this.generateMonitoringRecommendations()
    };

    return report;
  }

  /**
   * Helper methods for report generation
   */
  groupAlertsBySeverity() {
    const groups = { CRITICAL: 0, WARNING: 0, INFO: 0 };

    for (const alert of this.alerts.values()) {
      groups[alert.severity] = (groups[alert.severity] || 0) + 1;
    }

    return groups;
  }

  groupAlertsByComponent() {
    const groups = {};

    for (const alert of this.alerts.values()) {
      const component = alert.labels.component || 'unknown';
      groups[component] = (groups[component] || 0) + 1;
    }

    return groups;
  }

  groupIncidentsByPriority() {
    const groups = { P1: 0, P2: 0, P3: 0 };

    for (const incident of this.incidents) {
      groups[incident.priority] = (groups[incident.priority] || 0) + 1;
    }

    return groups;
  }

  getRecentAlerts(limit = 50) {
    return Array.from(this.alerts.values())
      .sort((a, b) => new Date(b.created) - new Date(a.created))
      .slice(0, limit);
  }

  getRecentIncidents(limit = 20) {
    return this.incidents
      .sort((a, b) => new Date(b.created) - new Date(a.created))
      .slice(0, limit);
  }

  getSLOStatus() {
    const sloStatus = {};

    for (const [sloKey, slo] of this.slos) {
      const metric = this.metrics.get(slo.metric);
      if (metric) {
        const breach = this.checkSLOBreach(slo, metric.value);
        sloStatus[sloKey] = {
          name: slo.name,
          target: slo.target,
          current: metric.value,
          status: breach.isBreached ? 'BREACHED' : 'COMPLIANT',
          deviation: breach.deviation
        };
      }
    }

    return sloStatus;
  }

  calculateAverageResolutionTime() {
    const resolvedIncidents = this.incidents.filter(inc => inc.status === 'RESOLVED');

    if (resolvedIncidents.length === 0) return 0;

    const totalResolutionTime = resolvedIncidents.reduce((sum, inc) => {
      const created = new Date(inc.created);
      const resolved = new Date(inc.updated);
      return sum + (resolved - created);
    }, 0);

    return totalResolutionTime / resolvedIncidents.length / (1000 * 60 * 60); // Hours
  }

  generateMonitoringRecommendations() {
    const recommendations = [];

    const criticalAlerts = Array.from(this.alerts.values())
      .filter(a => a.severity === 'CRITICAL' && a.status === 'OPEN');

    if (criticalAlerts.length > 0) {
      recommendations.push('Address critical alerts immediately to prevent system impact');
    }

    const breachedSLOs = Object.values(this.getSLOStatus())
      .filter(slo => slo.status === 'BREACHED');

    if (breachedSLOs.length > 0) {
      recommendations.push('Review and improve SLO performance to maintain service quality');
    }

    const avgResolutionTime = this.calculateAverageResolutionTime();
    if (avgResolutionTime > 4) { // More than 4 hours
      recommendations.push('Improve incident response time through better processes or automation');
    }

    return recommendations;
  }

  parseTimeRange(range) {
    const unit = range.slice(-1);
    const value = parseInt(range.slice(0, -1));

    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000; // Default 24 hours
    }
  }

  /**
   * Start monitoring loops
   */
  startMonitoring() {
    // Check thresholds every 5 minutes
    setInterval(() => {
      this.checkThresholds();
    }, 5 * 60 * 1000);

    // Update SLO status every 15 minutes
    setInterval(() => {
      this.checkSLOMetrics();
    }, 15 * 60 * 1000);

    console.log('[InstitutionalMonitoringEngine] Monitoring loops started');
  }
}

module.exports = InstitutionalMonitoringEngine;