import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'crm-core': [
            'src/sales/CRMKanban.tsx',
            'src/sales/CRMListView.tsx',
            'src/sales/CRMLeadDetail.tsx',
            'src/sales/CRMKpiBar.tsx',
            'src/sales/CRMKpiModals.tsx',
            'src/sales/CRMFilters.tsx',
            'src/sales/CRMNewLeadModal.tsx',
            'src/sales/LiveNewsBanner.tsx',
          ],
          'crm-import': [
            'src/sales/import/CRMImportModal.tsx',
            'src/sales/import/crmImportUtils.ts',
          ],
          'workstation': [
            'src/sales/workstation/WorkstationModals.tsx',
            'src/sales/workstation/WidgetActionsRapides.tsx',
            'src/sales/workstation/WidgetMaJournee.tsx',
            'src/sales/workstation/WidgetKpis.tsx',
          ],
          'samples': [
            'src/sales/SamplesSection.tsx',
            'src/sales/AdminSamplesPage.tsx',
            'src/sales/SampleRequestModal.tsx',
            'src/sales/SamplesTeamAnalyticsModal.tsx',
          ],
        },
      },
    },
  },
});
