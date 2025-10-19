import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-home-page',
  imports: [CommonModule, RouterModule],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})
export class HomePageComponent {
  featureColumns = [
    {
      title: 'Universal ingestion',
      description: 'Drag and drop PDFs, DOCX, images, or paste URLs and spreadsheets to capture every offer in one place.'
    },
    {
      title: 'AI field normalization',
      description: 'Automatically detect role, location, compensation, and requirements with confidence scoring.'
    },
    {
      title: 'Verified data delivery',
      description: 'Route ready-to-use datasets to ATS, CRM, or BI tools with audit trails and review checkpoints.'
    }
  ];

  practicalExamples = [
    {
      icon: 'star',
      title: 'PDF vacancy parsing',
      description: 'Split multi-page job packs into structured attributes without losing tables or rich formatting.'
    },
    {
      icon: 'camera',
      title: 'On-site capture',
      description: 'Turn photos or screenshots from field visits into searchable, shareable job briefs instantly.'
    },
    {
      icon: 'grid',
      title: 'Spreadsheet aggregation',
      description: 'Merge columns from vendor trackers, staffing partners, or university listings into one canonical view.'
    },
    {
      icon: 'spark',
      title: 'Comp insight benchmarking',
      description: 'Compare salary and benefit signals across regions to guide offer strategy and approvals.'
    }
  ];

  automationSteps = [
    {
      label: 'Select',
      description: 'Choose the files, screenshots, or links you want to convert into structured records.'
    },
    {
      label: 'Extract',
      description: 'Apply reusable blueprints that parse titles, skills, salary ranges, and hiring contacts automatically.'
    },
    {
      label: 'Integrate',
      description: 'Push verified datasets to ATS, CRMs, Slack, or BI dashboards and trigger downstream automations.'
    }
  ];

  robotTemplates = [
    {
      logo: 'pf',
      name: 'PDF offer pack',
      description: 'Extract positions, salary bands, deadlines, and hiring manager details from multi-page PDFs.',
      formats: ['CSV', 'XLSX', 'Google Sheets'],
      cta: 'Use template'
    },
    {
      logo: 'sc',
      name: 'Screenshot reader',
      description: 'Convert photos or mobile screenshots of postings into structured role descriptions.',
      formats: ['CSV', 'Airtable', 'Notion'],
      cta: 'Use template'
    },
    {
      logo: 'wb',
      name: 'Career site crawler',
      description: 'Capture job data from public or private requisition pages without manual copy-paste.',
      formats: ['CSV', 'HubSpot', 'Greenhouse'],
      cta: 'Use template'
    },
    {
      logo: 'api',
      name: 'Custom connector',
      description: 'Blend internal spreadsheets, APIs, or FTP drops with WorkInsight parsing in a single flow.',
      formats: ['CSV', 'XLSX', 'JSON', 'Webhooks'],
      cta: 'View more'
    }
  ];

  faqs = [
    {
      question: 'Which file formats can WorkInsight process?',
      answer: 'We support PDF, DOCX, CSV, XLSX, PNG/JPG screenshots, and direct URLs. Mix formats in the same batch without extra configuration.'
    },
    {
      question: 'Can I validate extracted fields before exporting?',
      answer: 'Yes. Configure review rules to flag low-confidence fields, assign them to reviewers, and capture approvals with full audit trails.'
    },
    {
      question: 'Do I need to write code?',
      answer: 'No coding is required. Use reusable templates or build new ones with our visual designer, then extend with scripts only if needed.'
    },
    {
      question: 'How do teams collaborate on the platform?',
      answer: 'Invite hiring operations, recruiters, or analysts to shared workspaces, assign ownership, and track every change with activity logs.'
    },
    {
      question: 'Is our data secure?',
      answer: 'Credentials are encrypted, data is processed in isolated environments, and every run includes compliance-ready logging.'
    },
    {
      question: 'What support is available?',
      answer: 'Access onboarding sessions, best-practice templates, and priority support from specialists who understand recruiting operations.'
    }
  ];

  openFaqIndex: number | null = null;
  currentYear = new Date().getFullYear();

  toggleFaq(index: number): void {
    this.openFaqIndex = this.openFaqIndex === index ? null : index;
  }
}
