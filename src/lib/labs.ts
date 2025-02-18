import { supabase } from './supabase/client';
import type { LabReport, LabSection, LabResult, ParsedSection, LabReportData } from '@/types/labs';
import { getCurrentUser } from './auth';

// Load lab reports from Supabase
export async function loadLabReports(userId: string): Promise<LabReport[]> {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // First get the lab reports
    let query = supabase
      .from('lab_reports')
      .select('*')
      .order('collection_date', { ascending: false });

    // Filter based on user role
    if (user.role === 'patient') {
      query = query.eq('patient_id', user.id);
    } else if (user.role === 'provider') {
      query = query.eq('provider_id', user.id);
    }

    const { data: reports, error: reportsError } = await query;

    if (reportsError) {
      console.error('Error loading lab reports:', reportsError);
      throw reportsError;
    }

    if (!reports?.length) {
      return [];
    }

    // Then get sections for these reports
    const { data: sections, error: sectionsError } = await supabase
      .from('lab_sections')
      .select('*')
      .in('report_id', reports.map(r => r.id));

    if (sectionsError) {
      console.error('Error loading lab sections:', sectionsError);
      throw sectionsError;
    }

    // Finally get results for these sections
    const { data: results, error: resultsError } = await supabase
      .from('lab_results')
      .select('*')
      .in('section_id', sections.map(s => s.id));

    if (resultsError) {
      console.error('Error loading lab results:', resultsError);
      throw resultsError;
    }

    // Combine the data
    const sectionMap = new Map(sections.map(section => [
      section.id,
      { ...section, results: [] }
    ]));

    results?.forEach(result => {
      const section = sectionMap.get(result.section_id);
      if (section) {
        section.results = section.results || [];
        section.results.push(result);
      }
    });

    return reports.map(report => ({
      ...report,
      sections: sections
        .filter(s => s.report_id === report.id)
        .map(section => ({
          ...sectionMap.get(section.id),
          results: sectionMap.get(section.id)?.results || []
        }))
    }));

  } catch (error) {
    console.error('Failed to load lab reports:', error);
    throw error;
  }
}

// Save lab report and PDF
export async function saveLabReport(reportData: LabReportData, pdfFile?: File) {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    let pdfUrl: string | undefined;

    // If PDF file is provided, save it to storage
    if (pdfFile) {
      const timestamp = new Date().getTime();
      const fileName = pdfFile.name.toLowerCase().endsWith('.pdf') 
        ? pdfFile.name 
        : `${pdfFile.name}.pdf`;
      const filePath = `${user.id}/${timestamp}-${fileName}`;
      
      // Create a new Blob with PDF MIME type to ensure proper content type
      const pdfBlob = new Blob([await pdfFile.arrayBuffer()], { type: 'application/pdf' });
      
      const { data: fileData, error: uploadError } = await supabase.storage
        .from('labs')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading PDF:', uploadError);
        throw new Error(
          uploadError.message.includes('Policy check failed') 
            ? 'Permission denied: You do not have permission to upload this file'
            : `Failed to upload PDF: ${uploadError.message}`
        );
      }

      // Get a signed URL with 7 day expiry
      const { data: urlData, error: urlError } = await supabase.storage
        .from('labs')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days expiry

      if (urlError) {
        console.error('Error creating signed URL:', urlError);
        throw new Error(`Failed to create signed URL: ${urlError.message}`);
      }

      pdfUrl = urlData.signedUrl;
    }

    // Create lab report record
    const { data: report, error: reportError } = await supabase
      .from('lab_reports')
      .insert({
        patient_id: user.role === 'patient' ? user.id : null,
        provider_id: user.role === 'provider' ? user.id : null,
        specimen_id: reportData.specimenId,
        collection_date: reportData.collectionDate,
        pdf_url: pdfUrl
      })
      .select()
      .single();

    if (reportError) {
      console.error('Error creating lab report:', reportError);
      throw new Error(
        reportError.message.includes('Policy check failed')
          ? 'Permission denied: You do not have permission to create lab reports'
          : `Failed to create lab report: ${reportError.message}`
      );
    }

    // Create sections and results
    for (const [sectionName, sectionData] of Object.entries(reportData.sections)) {
      const { data: section, error: sectionError } = await supabase
        .from('lab_sections')
        .insert({
          report_id: report.id,
          name: sectionName,
          type: sectionData.type,
          content: sectionData.type === 'text' ? sectionData.content : null
        })
        .select()
        .single();

      if (sectionError) {
        console.error('Error creating lab section:', sectionError);
        throw new Error(
          sectionError.message.includes('Policy check failed')
            ? 'Permission denied: You do not have permission to create lab sections'
            : `Failed to create lab section: ${sectionError.message}`
        );
      }

      if (sectionData.type === 'table' && sectionData.results) {
        const results = sectionData.results.map(result => ({
          section_id: section.id,
          test_name: result.testName,
          current_result: result.currentResult,
          flag: result.flag,
          previous_result: result.previousResult,
          previous_date: result.previousDate,
          units: result.units,
          reference_interval: result.referenceInterval
        }));

        const { error: resultsError } = await supabase
          .from('lab_results')
          .insert(results);

      if (resultsError) {
        console.error('Error creating lab results:', resultsError);
        throw new Error(
          resultsError.message.includes('Policy check failed')
            ? 'Permission denied: You do not have permission to create lab results'
            : `Failed to create lab results: ${resultsError.message}`
        );
      }

        // Update test types catalog
        await updateTestTypes(sectionName, sectionData);
      }
    }

    window.dispatchEvent(new Event('labUpdate'));
    return report;
  } catch (error) {
    console.error('Failed to save lab report:', error);
    throw error;
  }
}

// Helper function to update test types catalog
async function updateTestTypes(category: string, section: ParsedSection) {
  if (section.type !== 'table' || !section.results) return;

  for (const result of section.results) {
    const { error } = await supabase
      .from('test_types')
      .upsert({
        name: result.testName,
        category,
        default_units: result.units
      }, {
        onConflict: 'name'
      });

    if (error) {
      console.error('Error updating test types:', error);
    }
  }
}

// Get PDF URL
export async function getPdfUrl(filePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('labs')
      .createSignedUrl(filePath, 60 * 60 * 24); // 24 hours expiry

    if (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Failed to get PDF URL:', error);
    return null;
  }
}

// Subscribe to real-time lab updates
export function subscribeToLabUpdates(userId: string) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Subscribe to labs based on user role
  const channel = user.role === 'patient'
    ? supabase
        .channel('lab_reports')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'lab_reports',
            filter: `patient_id=eq.${user.id}`
          },
          () => window.dispatchEvent(new Event('labUpdate'))
        )
        .subscribe()
    : supabase
        .channel('lab_reports')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'lab_reports',
            filter: `provider_id=eq.${user.id}`
          },
          () => window.dispatchEvent(new Event('labUpdate'))
        )
        .subscribe();

  return () => {
    channel.unsubscribe();
  };
}
