# كتالوج الأدوات الحديثة

**العدد:** 180 أداة  
**الحالة الافتراضية:** تعريفات فقط، غير متصلة، وغير مفعّلة

| # | المعرّف | الاسم | المجال | العملية | المخاطر | الموافقة | المزوّد |
|---:|---|---|---|---|---|---|---|
| 1 | `nx.data.query-catalog` | Query Catalog | data-platform | read | low | لا | NEXIOS Data Platform |
| 2 | `nx.data.inspect-schema` | Inspect Schema | data-platform | read | low | لا | NEXIOS Data Platform |
| 3 | `nx.data.profile-dataset` | Profile Dataset | data-platform | analyze | low | لا | NEXIOS Data Platform |
| 4 | `nx.data.validate-quality` | Validate Data Quality | data-platform | analyze | low | لا | NEXIOS Data Platform |
| 5 | `nx.data.trace-lineage` | Trace Data Lineage | data-platform | analyze | low | لا | NEXIOS Data Platform |
| 6 | `nx.data.compare-snapshots` | Compare Data Snapshots | data-platform | analyze | low | لا | NEXIOS Data Platform |
| 7 | `nx.data.publish-metric` | Publish Governed Metric | data-platform | write | medium | نعم | NEXIOS Data Platform |
| 8 | `nx.data.register-data-product` | Register Data Product | data-platform | write | medium | نعم | NEXIOS Data Platform |
| 9 | `nx.data.quarantine-record` | Quarantine Data Record | data-platform | action | high | نعم | NEXIOS Data Platform |
| 10 | `nx.data.export-dataset` | Export Controlled Dataset | data-platform | action | high | نعم | NEXIOS Data Platform |
| 11 | `nx.knowledge.search-corpus` | Search Knowledge Corpus | knowledge-rag | read | low | لا | NEXIOS Knowledge |
| 12 | `nx.knowledge.fetch-source` | Fetch Authoritative Source | knowledge-rag | read | low | لا | NEXIOS Knowledge |
| 13 | `nx.knowledge.verify-citation` | Verify Citation Support | knowledge-rag | analyze | low | لا | NEXIOS Knowledge |
| 14 | `nx.knowledge.chunk-document` | Chunk Document | knowledge-rag | analyze | low | لا | NEXIOS Knowledge |
| 15 | `nx.knowledge.embed-content` | Embed Approved Content | knowledge-rag | write | medium | نعم | NEXIOS Knowledge |
| 16 | `nx.knowledge.rerank-results` | Rerank Retrieval Results | knowledge-rag | analyze | low | لا | NEXIOS Knowledge |
| 17 | `nx.knowledge.publish-knowledge` | Publish Knowledge Item | knowledge-rag | write | medium | نعم | NEXIOS Knowledge |
| 18 | `nx.knowledge.archive-document` | Archive Knowledge Document | knowledge-rag | action | high | نعم | NEXIOS Knowledge |
| 19 | `nx.knowledge.invalidate-index` | Invalidate Knowledge Index | knowledge-rag | admin | critical | نعم | NEXIOS Knowledge |
| 20 | `nx.knowledge.rebuild-index` | Rebuild Knowledge Index | knowledge-rag | admin | critical | نعم | NEXIOS Knowledge |
| 21 | `nx.ai.model-route` | Route Approved Model | ai-services | analyze | low | لا | NEXIOS AI Gateway |
| 22 | `nx.ai.classify-intent` | Classify Task Intent | ai-services | analyze | low | لا | NEXIOS AI Gateway |
| 23 | `nx.ai.generate-structured` | Generate Structured Output | ai-services | analyze | low | لا | NEXIOS AI Gateway |
| 24 | `nx.ai.extract-entities` | Extract Governed Entities | ai-services | analyze | low | لا | NEXIOS AI Gateway |
| 25 | `nx.ai.summarize-grounded` | Create Grounded Summary | ai-services | analyze | low | لا | NEXIOS AI Gateway |
| 26 | `nx.ai.evaluate-response` | Evaluate Model Response | ai-services | analyze | low | لا | NEXIOS AI Gateway |
| 27 | `nx.ai.detect-hallucination` | Detect Unsupported Claims | ai-services | analyze | low | لا | NEXIOS AI Gateway |
| 28 | `nx.ai.detect-prompt-injection` | Detect Prompt Injection | ai-services | analyze | low | لا | NEXIOS AI Gateway |
| 29 | `nx.ai.redact-sensitive` | Redact Sensitive Content | ai-services | action | high | نعم | NEXIOS AI Gateway |
| 30 | `nx.ai.estimate-cost` | Estimate AI Run Cost | ai-services | read | low | لا | NEXIOS AI Gateway |
| 31 | `nx.agents.discover-agent` | Discover Approved Agent | agent-platform | read | low | لا | NEXIOS Agent Runtime |
| 32 | `nx.agents.read-agent-card` | Read A2A Agent Card | agent-platform | read | low | لا | NEXIOS Agent Runtime |
| 33 | `nx.agents.delegate-task` | Delegate Agent Task | agent-platform | action | high | نعم | NEXIOS Agent Runtime |
| 34 | `nx.agents.get-task-status` | Get Agent Task Status | agent-platform | read | low | لا | NEXIOS Agent Runtime |
| 35 | `nx.agents.cancel-task` | Cancel Agent Task | agent-platform | action | high | نعم | NEXIOS Agent Runtime |
| 36 | `nx.agents.handoff-context` | Handoff Controlled Context | agent-platform | action | high | نعم | NEXIOS Agent Runtime |
| 37 | `nx.agents.evaluate-run` | Evaluate Agent Run | agent-platform | analyze | low | لا | NEXIOS Agent Runtime |
| 38 | `nx.agents.inspect-memory` | Inspect Agent Memory | agent-platform | read | low | لا | NEXIOS Agent Runtime |
| 39 | `nx.agents.revoke-memory` | Revoke Agent Memory | agent-platform | admin | critical | نعم | NEXIOS Agent Runtime |
| 40 | `nx.agents.replay-run` | Replay Agent Run in Sandbox | agent-platform | action | high | نعم | NEXIOS Agent Runtime |
| 41 | `nx.secops.list-incidents` | List Security Incidents | security-operations | read | medium | لا | NEXIOS Security Operations |
| 42 | `nx.secops.get-incident` | Get Security Incident | security-operations | read | medium | لا | NEXIOS Security Operations |
| 43 | `nx.secops.correlate-alerts` | Correlate Security Alerts | security-operations | analyze | medium | لا | NEXIOS Security Operations |
| 44 | `nx.secops.score-severity` | Score Incident Severity | security-operations | analyze | medium | لا | NEXIOS Security Operations |
| 45 | `nx.secops.create-incident` | Create Security Incident | security-operations | write | medium | نعم | NEXIOS Security Operations |
| 46 | `nx.secops.update-incident` | Update Security Incident | security-operations | write | medium | نعم | NEXIOS Security Operations |
| 47 | `nx.secops.escalate-incident` | Escalate Security Incident | security-operations | action | high | نعم | NEXIOS Security Operations |
| 48 | `nx.secops.attach-evidence` | Attach Incident Evidence | security-operations | write | medium | نعم | NEXIOS Security Operations |
| 49 | `nx.secops.isolate-asset` | Isolate Affected Asset | security-operations | admin | critical | نعم | NEXIOS Security Operations |
| 50 | `nx.secops.close-incident` | Close Security Incident | security-operations | action | high | نعم | NEXIOS Security Operations |
| 51 | `nx.physical.query-access-events` | Query Access Events | physical-security | read | medium | لا | NEXIOS Physical Security |
| 52 | `nx.physical.search-cctv-events` | Search CCTV Events | physical-security | read | medium | لا | NEXIOS Physical Security |
| 53 | `nx.physical.locate-patrol` | Locate Available Patrol | physical-security | read | medium | لا | NEXIOS Physical Security |
| 54 | `nx.physical.check-visitor` | Check Visitor Authorization | physical-security | read | medium | لا | NEXIOS Physical Security |
| 55 | `nx.physical.check-vehicle` | Check Vehicle Authorization | physical-security | read | medium | لا | NEXIOS Physical Security |
| 56 | `nx.physical.dispatch-patrol` | Dispatch Patrol | physical-security | action | high | نعم | NEXIOS Physical Security |
| 57 | `nx.physical.lock-access-zone` | Lock Access Zone | physical-security | admin | critical | نعم | NEXIOS Physical Security |
| 58 | `nx.physical.acknowledge-alarm` | Acknowledge Security Alarm | physical-security | write | medium | نعم | NEXIOS Physical Security |
| 59 | `nx.physical.export-evidence` | Export Security Evidence | physical-security | action | high | نعم | NEXIOS Physical Security |
| 60 | `nx.physical.issue-watchlist-alert` | Issue Watchlist Alert | physical-security | action | high | نعم | NEXIOS Physical Security |
| 61 | `nx.safety.list-permits` | List Work Permits | hse-ptw | read | medium | لا | NEXIOS Safety |
| 62 | `nx.safety.inspect-permit` | Inspect Work Permit | hse-ptw | read | medium | لا | NEXIOS Safety |
| 63 | `nx.safety.validate-controls` | Validate Critical Controls | hse-ptw | analyze | medium | لا | NEXIOS Safety |
| 64 | `nx.safety.record-safety-observation` | Record Safety Observation | hse-ptw | write | medium | نعم | NEXIOS Safety |
| 65 | `nx.safety.create-near-miss` | Create Near-Miss Record | hse-ptw | write | medium | نعم | NEXIOS Safety |
| 66 | `nx.safety.suspend-permit` | Suspend Work Permit | hse-ptw | action | high | نعم | NEXIOS Safety |
| 67 | `nx.safety.approve-permit` | Approve Work Permit | hse-ptw | admin | critical | نعم | NEXIOS Safety |
| 68 | `nx.safety.dispatch-emergency` | Dispatch Emergency Response | hse-ptw | action | high | نعم | NEXIOS Safety |
| 69 | `nx.safety.start-evacuation` | Start Evacuation Workflow | hse-ptw | admin | critical | نعم | NEXIOS Safety |
| 70 | `nx.safety.close-permit` | Close Work Permit | hse-ptw | action | high | نعم | NEXIOS Safety |
| 71 | `nx.asset.get-asset-health` | Get Asset Health | asset-maintenance | read | low | لا | NEXIOS Asset Operations |
| 72 | `nx.asset.query-work-orders` | Query Work Orders | asset-maintenance | read | low | لا | NEXIOS Asset Operations |
| 73 | `nx.asset.predict-failure` | Predict Asset Failure | asset-maintenance | analyze | low | لا | NEXIOS Asset Operations |
| 74 | `nx.asset.rank-criticality` | Rank Asset Criticality | asset-maintenance | analyze | low | لا | NEXIOS Asset Operations |
| 75 | `nx.asset.create-work-order` | Create Work Order | asset-maintenance | write | medium | نعم | NEXIOS Asset Operations |
| 76 | `nx.asset.reschedule-work-order` | Reschedule Work Order | asset-maintenance | write | medium | نعم | NEXIOS Asset Operations |
| 77 | `nx.asset.reserve-spare` | Reserve Spare Part | asset-maintenance | action | high | نعم | NEXIOS Asset Operations |
| 78 | `nx.asset.update-asset-status` | Update Asset Status | asset-maintenance | write | medium | نعم | NEXIOS Asset Operations |
| 79 | `nx.asset.sync-digital-twin` | Synchronize Digital Twin | asset-maintenance | action | high | نعم | NEXIOS Asset Operations |
| 80 | `nx.asset.close-work-order` | Close Work Order | asset-maintenance | action | high | نعم | NEXIOS Asset Operations |
| 81 | `nx.workflow.list-workflows` | List Workflows | workflow-orchestration | read | low | لا | NEXIOS Workflow Runtime |
| 82 | `nx.workflow.inspect-workflow` | Inspect Workflow | workflow-orchestration | read | low | لا | NEXIOS Workflow Runtime |
| 83 | `nx.workflow.validate-arazzo` | Validate Arazzo Workflow | workflow-orchestration | analyze | low | لا | NEXIOS Workflow Runtime |
| 84 | `nx.workflow.simulate-workflow` | Simulate Workflow | workflow-orchestration | analyze | low | لا | NEXIOS Workflow Runtime |
| 85 | `nx.workflow.start-workflow` | Start Workflow | workflow-orchestration | action | high | نعم | NEXIOS Workflow Runtime |
| 86 | `nx.workflow.pause-workflow` | Pause Workflow | workflow-orchestration | action | high | نعم | NEXIOS Workflow Runtime |
| 87 | `nx.workflow.resume-workflow` | Resume Workflow | workflow-orchestration | action | high | نعم | NEXIOS Workflow Runtime |
| 88 | `nx.workflow.cancel-workflow` | Cancel Workflow | workflow-orchestration | action | high | نعم | NEXIOS Workflow Runtime |
| 89 | `nx.workflow.retry-failed-step` | Retry Failed Workflow Step | workflow-orchestration | action | high | نعم | NEXIOS Workflow Runtime |
| 90 | `nx.workflow.publish-workflow` | Publish Workflow Version | workflow-orchestration | admin | critical | نعم | NEXIOS Workflow Runtime |
| 91 | `nx.documents.search-sharepoint` | Search SharePoint | documents-files | read | medium | لا | Microsoft Graph / SharePoint |
| 92 | `nx.documents.read-drive-file` | Read Drive File | documents-files | read | medium | لا | Microsoft Graph / SharePoint |
| 93 | `nx.documents.list-permissions` | List File Permissions | documents-files | read | medium | لا | Microsoft Graph / SharePoint |
| 94 | `nx.documents.extract-document` | Extract Document Content | documents-files | analyze | medium | لا | Microsoft Graph / SharePoint |
| 95 | `nx.documents.classify-document` | Classify Document | documents-files | analyze | medium | لا | Microsoft Graph / SharePoint |
| 96 | `nx.documents.create-document` | Create Document | documents-files | write | medium | نعم | Microsoft Graph / SharePoint |
| 97 | `nx.documents.upload-file` | Upload File | documents-files | write | medium | نعم | Microsoft Graph / SharePoint |
| 98 | `nx.documents.update-file-metadata` | Update File Metadata | documents-files | write | medium | نعم | Microsoft Graph / SharePoint |
| 99 | `nx.documents.share-file` | Share File | documents-files | action | high | نعم | Microsoft Graph / SharePoint |
| 100 | `nx.documents.revoke-file-access` | Revoke File Access | documents-files | admin | critical | نعم | Microsoft Graph / SharePoint |
| 101 | `nx.communications.search-mail` | Search Mail | communications | read | medium | لا | Microsoft Graph / Microsoft 365 |
| 102 | `nx.communications.read-thread` | Read Mail Thread | communications | read | medium | لا | Microsoft Graph / Microsoft 365 |
| 103 | `nx.communications.draft-mail` | Draft Mail | communications | write | medium | نعم | Microsoft Graph / Microsoft 365 |
| 104 | `nx.communications.send-mail` | Send Mail | communications | action | high | نعم | Microsoft Graph / Microsoft 365 |
| 105 | `nx.communications.schedule-meeting` | Schedule Meeting | communications | action | high | نعم | Microsoft Graph / Microsoft 365 |
| 106 | `nx.communications.post-teams-message` | Post Teams Message | communications | action | high | نعم | Microsoft Graph / Microsoft 365 |
| 107 | `nx.communications.create-teams-channel` | Create Teams Channel | communications | admin | critical | نعم | Microsoft Graph / Microsoft 365 |
| 108 | `nx.communications.notify-on-call` | Notify On-Call Team | communications | action | high | نعم | Microsoft Graph / Microsoft 365 |
| 109 | `nx.communications.publish-status-update` | Publish Status Update | communications | action | high | نعم | Microsoft Graph / Microsoft 365 |
| 110 | `nx.communications.retract-message` | Retract Message | communications | admin | critical | نعم | Microsoft Graph / Microsoft 365 |
| 111 | `nx.identity.get-user` | Get Directory User | identity-access | read | medium | لا | Microsoft Entra / Graph |
| 112 | `nx.identity.list-group-members` | List Group Members | identity-access | read | medium | لا | Microsoft Entra / Graph |
| 113 | `nx.identity.inspect-app-permissions` | Inspect Application Permissions | identity-access | read | medium | لا | Microsoft Entra / Graph |
| 114 | `nx.identity.review-privileged-roles` | Review Privileged Roles | identity-access | analyze | medium | لا | Microsoft Entra / Graph |
| 115 | `nx.identity.request-access` | Request Access | identity-access | write | medium | نعم | Microsoft Entra / Graph |
| 116 | `nx.identity.revoke-session` | Revoke User Session | identity-access | admin | critical | نعم | Microsoft Entra / Graph |
| 117 | `nx.identity.disable-account` | Disable User Account | identity-access | admin | critical | نعم | Microsoft Entra / Graph |
| 118 | `nx.identity.rotate-app-secret` | Rotate Application Secret | identity-access | admin | critical | نعم | Microsoft Entra / Graph |
| 119 | `nx.identity.add-group-member` | Add Group Member | identity-access | admin | critical | نعم | Microsoft Entra / Graph |
| 120 | `nx.identity.remove-group-member` | Remove Group Member | identity-access | admin | critical | نعم | Microsoft Entra / Graph |
| 121 | `nx.sap.read-business-partner` | Read Business Partner | sap-erp | read | medium | لا | SAP OData / Business APIs |
| 122 | `nx.sap.read-purchase-order` | Read Purchase Order | sap-erp | read | medium | لا | SAP OData / Business APIs |
| 123 | `nx.sap.read-maintenance-order` | Read Maintenance Order | sap-erp | read | medium | لا | SAP OData / Business APIs |
| 124 | `nx.sap.read-inventory` | Read Inventory | sap-erp | read | medium | لا | SAP OData / Business APIs |
| 125 | `nx.sap.create-purchase-requisition` | Create Purchase Requisition | sap-erp | write | medium | نعم | SAP OData / Business APIs |
| 126 | `nx.sap.update-purchase-order` | Update Purchase Order | sap-erp | write | medium | نعم | SAP OData / Business APIs |
| 127 | `nx.sap.post-goods-receipt` | Post Goods Receipt | sap-erp | action | high | نعم | SAP OData / Business APIs |
| 128 | `nx.sap.create-maintenance-order` | Create Maintenance Order | sap-erp | write | medium | نعم | SAP OData / Business APIs |
| 129 | `nx.sap.approve-invoice` | Approve Supplier Invoice | sap-erp | admin | critical | نعم | SAP OData / Business APIs |
| 130 | `nx.sap.cancel-document` | Cancel SAP Document | sap-erp | admin | critical | نعم | SAP OData / Business APIs |
| 131 | `nx.oracle.read-supplier` | Read Supplier | oracle-erp | read | medium | لا | Oracle Fusion / ERP APIs |
| 132 | `nx.oracle.read-purchase-order` | Read Purchase Order | oracle-erp | read | medium | لا | Oracle Fusion / ERP APIs |
| 133 | `nx.oracle.read-asset` | Read Fixed Asset | oracle-erp | read | medium | لا | Oracle Fusion / ERP APIs |
| 134 | `nx.oracle.read-ledger` | Read Ledger | oracle-erp | read | medium | لا | Oracle Fusion / ERP APIs |
| 135 | `nx.oracle.create-requisition` | Create Requisition | oracle-erp | write | medium | نعم | Oracle Fusion / ERP APIs |
| 136 | `nx.oracle.update-supplier` | Update Supplier | oracle-erp | write | medium | نعم | Oracle Fusion / ERP APIs |
| 137 | `nx.oracle.post-journal` | Post Journal Entry | oracle-erp | admin | critical | نعم | Oracle Fusion / ERP APIs |
| 138 | `nx.oracle.create-work-order` | Create Work Order | oracle-erp | write | medium | نعم | Oracle Fusion / ERP APIs |
| 139 | `nx.oracle.approve-payment` | Approve Payment | oracle-erp | admin | critical | نعم | Oracle Fusion / ERP APIs |
| 140 | `nx.oracle.reverse-transaction` | Reverse Transaction | oracle-erp | admin | critical | نعم | Oracle Fusion / ERP APIs |
| 141 | `nx.observability.query-traces` | Query Traces | observability | read | low | لا | OpenTelemetry-compatible Backend |
| 142 | `nx.observability.query-metrics` | Query Metrics | observability | read | low | لا | OpenTelemetry-compatible Backend |
| 143 | `nx.observability.query-logs` | Query Logs | observability | read | low | لا | OpenTelemetry-compatible Backend |
| 144 | `nx.observability.get-service-health` | Get Service Health | observability | read | low | لا | OpenTelemetry-compatible Backend |
| 145 | `nx.observability.correlate-telemetry` | Correlate Telemetry Signals | observability | analyze | low | لا | OpenTelemetry-compatible Backend |
| 146 | `nx.observability.create-alert-rule` | Create Alert Rule | observability | write | medium | نعم | OpenTelemetry-compatible Backend |
| 147 | `nx.observability.silence-alert` | Silence Alert | observability | action | high | نعم | OpenTelemetry-compatible Backend |
| 148 | `nx.observability.capture-profile` | Capture Runtime Profile | observability | action | high | نعم | OpenTelemetry-compatible Backend |
| 149 | `nx.observability.export-trace` | Export Trace Evidence | observability | action | high | نعم | OpenTelemetry-compatible Backend |
| 150 | `nx.observability.annotate-incident` | Annotate Incident Timeline | observability | write | medium | نعم | OpenTelemetry-compatible Backend |
| 151 | `nx.devsecops.read-repository` | Read Repository Metadata | devsecops | read | low | لا | Git / CI / Security Platforms |
| 152 | `nx.devsecops.list-pull-requests` | List Pull Requests | devsecops | read | low | لا | Git / CI / Security Platforms |
| 153 | `nx.devsecops.inspect-ci-run` | Inspect CI Run | devsecops | read | low | لا | Git / CI / Security Platforms |
| 154 | `nx.devsecops.scan-dependencies` | Scan Dependencies | devsecops | analyze | low | لا | Git / CI / Security Platforms |
| 155 | `nx.devsecops.scan-secrets` | Scan for Exposed Secrets | devsecops | analyze | low | لا | Git / CI / Security Platforms |
| 156 | `nx.devsecops.create-issue` | Create Engineering Issue | devsecops | write | medium | نعم | Git / CI / Security Platforms |
| 157 | `nx.devsecops.open-pull-request` | Open Pull Request | devsecops | write | medium | نعم | Git / CI / Security Platforms |
| 158 | `nx.devsecops.rerun-pipeline` | Rerun CI Pipeline | devsecops | action | high | نعم | Git / CI / Security Platforms |
| 159 | `nx.devsecops.deploy-release` | Deploy Approved Release | devsecops | admin | critical | نعم | Git / CI / Security Platforms |
| 160 | `nx.devsecops.rollback-release` | Rollback Release | devsecops | admin | critical | نعم | Git / CI / Security Platforms |
| 161 | `nx.twin.geocode-site` | Geocode Site | geospatial-iot | read | low | لا | NEXIOS Digital Twin / GIS |
| 162 | `nx.twin.route-patrol` | Route Patrol | geospatial-iot | analyze | low | لا | NEXIOS Digital Twin / GIS |
| 163 | `nx.twin.query-geofence` | Query Geofence | geospatial-iot | read | low | لا | NEXIOS Digital Twin / GIS |
| 164 | `nx.twin.get-weather-risk` | Get Weather Risk | geospatial-iot | read | low | لا | NEXIOS Digital Twin / GIS |
| 165 | `nx.twin.read-iot-signal` | Read IoT Signal | geospatial-iot | read | low | لا | NEXIOS Digital Twin / GIS |
| 166 | `nx.twin.publish-iot-command` | Publish IoT Command | geospatial-iot | admin | critical | نعم | NEXIOS Digital Twin / GIS |
| 167 | `nx.twin.create-geofence` | Create Geofence | geospatial-iot | write | medium | نعم | NEXIOS Digital Twin / GIS |
| 168 | `nx.twin.update-twin-state` | Update Twin State | geospatial-iot | write | medium | نعم | NEXIOS Digital Twin / GIS |
| 169 | `nx.twin.locate-asset` | Locate Asset | geospatial-iot | read | low | لا | NEXIOS Digital Twin / GIS |
| 170 | `nx.twin.simulate-route` | Simulate Route | geospatial-iot | analyze | low | لا | NEXIOS Digital Twin / GIS |
| 171 | `nx.governance.list-controls` | List Applicable Controls | governance-compliance | read | low | لا | NEXIOS Governance |
| 172 | `nx.governance.map-evidence` | Map Evidence to Control | governance-compliance | analyze | low | لا | NEXIOS Governance |
| 173 | `nx.governance.assess-control` | Assess Control Effectiveness | governance-compliance | analyze | low | لا | NEXIOS Governance |
| 174 | `nx.governance.register-risk` | Register Governance Risk | governance-compliance | write | medium | نعم | NEXIOS Governance |
| 175 | `nx.governance.open-finding` | Open Audit Finding | governance-compliance | write | medium | نعم | NEXIOS Governance |
| 176 | `nx.governance.assign-remediation` | Assign Remediation | governance-compliance | write | medium | نعم | NEXIOS Governance |
| 177 | `nx.governance.approve-exception` | Approve Control Exception | governance-compliance | admin | critical | نعم | NEXIOS Governance |
| 178 | `nx.governance.close-finding` | Close Audit Finding | governance-compliance | action | high | نعم | NEXIOS Governance |
| 179 | `nx.governance.export-audit-pack` | Export Audit Evidence Pack | governance-compliance | action | high | نعم | NEXIOS Governance |
| 180 | `nx.governance.attest-control` | Attest Control Operation | governance-compliance | admin | critical | نعم | NEXIOS Governance |
