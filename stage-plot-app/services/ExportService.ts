import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Project } from '../models';
import { resolveTabularPatch, TabularRow } from '../utils/signalChain';
import { Platform } from 'react-native';

export class ExportService {
  /**
   * Generates a PDF of the Patch Sheet and opens the share dialog.
   */
  static async exportPatchPDF(project: Project, selectedDeviceIds: string[]) {
    const tabularData = resolveTabularPatch(project);
    const devices = project.devices.filter(d => selectedDeviceIds.includes(d.id));
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto; padding: 20px; color: #333; }
          h1 { font-size: 24px; margin-bottom: 5px; color: #000; }
          .project-meta { font-size: 12px; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          th { background-color: #f3f4f6; text-align: left; padding: 10px; border: 1px solid #e5e7eb; }
          td { padding: 10px; border: 1px solid #e5e7eb; vertical-align: top; }
          .source-cell { font-weight: bold; width: 200px; }
          .hop-cell { width: 200px; }
          .hop-content { display: flex; justify-content: space-between; align-items: center; }
          .channel-name { font-weight: 500; }
          .connector { font-size: 9px; color: #9ca3af; }
          .arrow { color: #e5e7eb; margin: 0 5px; }
          .output-name { color: #2563eb; font-weight: 500; }
          .cable { font-size: 9px; color: #9ca3af; font-style: italic; }
          .no-route { color: #f3f4f6; font-size: 10px; text-align: center; }
          @media print {
            body { padding: 0; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
          }
        </style>
      </head>
      <body>
        <h1>${project.name}</h1>
        <div class="project-meta">
          Patch Sheet &bull; Generated on ${new Date().toLocaleDateString()}
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Source / Input</th>
              ${devices.map(d => `<th>${d.name}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tabularData.map(row => `
              <tr>
                <td class="source-cell">
                  <div>${row.sourceEffectiveName}</div>
                  <div style="font-weight: normal; font-size: 9px; color: #666; font-style: italic;">
                    ${row.sourceDeviceName} (${row.sourceChannelNumber})
                  </div>
                </td>
                ${selectedDeviceIds.map(deviceId => {
                  const hop = row.fullPath[deviceId];
                  if (!hop) return '<td class="no-route">No Route</td>';
                  return `
                    <td class="hop-cell">
                      <div class="hop-content">
                        <div style="text-align: center; flex: 1;">
                          <div class="channel-name">${hop.inputChannelName || (hop.inputChannelNumber ? `Ch ${hop.inputChannelNumber}` : '-')}</div>
                          ${hop.connectorType ? `<div class="connector">${hop.connectorType}</div>` : ''}
                        </div>
                        <div class="arrow">&rarr;</div>
                        <div style="text-align: center; flex: 1;">
                          ${hop.outputChannelId ? `
                            <div class="output-name">${hop.outputChannelName || `Ch ${hop.outputChannelNumber}`}</div>
                            ${hop.cableLabel ? `<div class="cable">${hop.cableLabel}</div>` : ''}
                          ` : '<div class="arrow">-</div>'}
                        </div>
                      </div>
                    </td>
                  `;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        ${project.notes ? `
          <div style="margin-top: 30px; border-top: 1px solid #eee; pt: 10px;">
            <h3 style="font-size: 14px;">Notes</h3>
            <p style="font-size: 11px; white-space: pre-wrap;">${project.notes}</p>
          </div>
        ` : ''}
      </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } else {
        // Web fallback
        await Print.printAsync({ html });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * Shares a PNG image from a URI (captured by ViewShot).
   */
  static async shareDiagramImage(uri: string, projectName: string) {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Sharing.shareAsync(uri, { dialogTitle: `Share ${projectName} Diagram` });
      } else {
        // Simple download for web
        const link = document.createElement('a');
        link.href = uri;
        link.download = `${projectName.replace(/\s+/g, '_')}_diagram.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error sharing diagram image:', error);
      throw error;
    }
  }
}
