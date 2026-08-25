{{- define "apollo-ui.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "apollo-ui.fullname" -}}
{{- printf "%s" (include "apollo-ui.name" .) -}}
{{- end -}}

{{- define "apollo-ui.labels" -}}
app.kubernetes.io/name: {{ include "apollo-ui.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: ui
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{- end -}}

{{- define "apollo-ui.selectorLabels" -}}
app.kubernetes.io/name: {{ include "apollo-ui.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
