import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthSessionService } from '../../services/auth-session.service';
import { LanguageService, UiLanguage } from '../../services/language.service';

interface HeroCardMetric {
  label: string;
  value: string;
  accent?: boolean;
}

interface HomeCopy {
  hero: {
    title: string;
    highlight: string;
    lead: string;
    primaryCta: string;
    secondaryCta: string;
    supportLink: string;
    supportHint: string;
    card: {
      title: string;
      metrics: HeroCardMetric[];
    };
    floatingTag: string;
  };
  features: {
    heading: string;
    subtitle: string;
    items: Array<{ title: string; description: string }>;
  };
  useCases: {
    eyebrow: string;
    title: string;
    description: string;
    items: Array<{ icon: string; title: string; description: string }>;
  };
  workflow: {
    eyebrow: string;
    header: string;
    title: string;
    description: string;
    steps: Array<{ label: string; description: string; hints: string[]; action: string }>;
  };
  robots: {
    eyebrow: string;
    title: string;
    description: string;
    templates: Array<{ logo: string; name: string; description: string; formats: string[]; cta: string }>;
  };
  matching: {
    eyebrow: string;
    title: string;
    subtitle: string;
    points: Array<{ title: string; description: string }>;
    cta: string;
  };
  faq: {
    heading: string;
    subtitle: string;
    items: Array<{ question: string; answer: string }>;
  };
}

const HOME_COPY: Record<UiLanguage, HomeCopy> = {
  en: {
    hero: {
      title: 'Bring every job offer into',
      highlight: 'one intelligent workspace',
      lead: 'WorkInsight ingests PDFs, screenshots, spreadsheets, and career site links, then turns them into structured data ready for sourcing, outreach, and reporting across any workflow.',
      primaryCta: 'Start extracting',
      secondaryCta: 'Connect my workspace',
      supportLink: 'See supported formats',
      supportHint: 'or review the end-to-end workflow below',
      card: {
        title: 'Live extraction preview',
        metrics: [
          { label: 'Source', value: 'Career page' },
          { label: 'Matches', value: '182 profiles' },
          { label: 'Confidence', value: '0.91', accent: true }
        ]
      },
      floatingTag: 'Unify job data'
    },
    features: {
      heading: 'Why teams rely on WorkInsight',
      subtitle: 'Purpose-built for operations, analysts, creators, and agencies that need reliable data from every job source.',
      items: [
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
      ]
    },
    useCases: {
      eyebrow: 'Practical examples',
      title: 'Actionable insights across every sourcing channel.',
      description: 'Upload job packs from email, drag in screenshots from the field, or sync with career portals. Push clean data to Sheets, CRMs, or automation tools in minutes.',
      items: [
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
      ]
    },
    workflow: {
      eyebrow: 'Extraction workflow',
      header: 'Follow these steps to move from raw offers to clean data.',
      title: 'Extract job offers in four guided steps.',
      description: 'Upload PDFs or images, let WorkInsight clean and enrich every field, review the normalized results, and export ready-to-use tables.',
      steps: [
        {
          label: 'Upload sources',
          description: 'Drop PDFs, DOCX files, screenshots, or URLs to gather every offer in one place.',
          hints: ['PDF & images', 'URLs'],
          action: 'Upload files'
        },
        {
          label: 'Run extraction',
          description: 'OCR and parsers detect title, company, location, emails, and skills automatically.',
          hints: ['OCR', 'AI parsing'],
          action: 'Process data'
        },
        {
          label: 'Review results',
          description: 'Open the results dashboard to search, filter, and validate structured job rows.',
          hints: ['Dashboard', 'Quality'],
          action: 'Open results'
        },
        {
          label: 'Export & share',
          description: 'Download an Excel-ready dataset or handoff CSVs to stakeholders instantly.',
          hints: ['Exports', 'Collaboration'],
          action: 'Download report'
        }
      ]
    },
    robots: {
      eyebrow: 'Import accelerators',
      title: 'Extract job data in under 2 minutes.',
      description: 'Skip manual setup with templates that handle the most common formats your team receives every day.',
      templates: [
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
      ]
    },
    matching: {
      eyebrow: 'CV intelligence',
      title: 'Match resumes with extracted job data.',
      subtitle: 'Upload a resume once and WorkInsight scores every extracted job for relevance.',
      points: [
        {
          title: 'Upload once, reuse everywhere',
          description: 'Store a resume on the profile page and keep summary, skills, and locations ready for matching.'
        },
        {
          title: 'Similarity scores you can trust',
          description: 'The matches view ranks top jobs using title similarity and overlapping skills.'
        },
        {
          title: 'Explainable fit',
          description: 'Preview aligned skills and see gaps so recruiters know where to focus outreach.'
        }
      ],
      cta: 'Explore CV matches'
    },
    faq: {
      heading: 'Frequently asked questions',
      subtitle: 'Everything you need to know about how WorkInsight accelerates recruiting operations.',
      items: [
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
          question: 'Is our data secure?',
          answer: 'Credentials are encrypted, data is processed in isolated environments, and every run includes compliance-ready logging.'
        },
        {
          question: 'What support is available?',
          answer: 'Access onboarding sessions, best-practice templates, and priority support from specialists who understand recruiting operations.'
        }
      ]
    }
  },
  fr: {
    hero: {
      title: 'Rassemblez chaque offre dans',
      highlight: 'un espace de travail intelligent',
      lead: 'WorkInsight ingere des PDF, des captures, des tableurs et des liens de sites de carriere, puis les transforme en donnees structurees pour le sourcing, la relance et le reporting.',
      primaryCta: 'Demarrer une extraction',
      secondaryCta: 'Connecter mon espace',
      supportLink: 'Voir les formats pris en charge',
      supportHint: 'ou parcourez le flux complet ci-dessous',
      card: {
        title: 'Apercu dextraction en direct',
        metrics: [
          { label: 'Source', value: 'Page carriere' },
          { label: 'Correspondances', value: '182 profils' },
          { label: 'Confiance', value: '0.91', accent: true }
        ]
      },
      floatingTag: 'Unifier les donnees emploi'
    },
    features: {
      heading: 'Pourquoi les equipes talent choisissent WorkInsight',
      subtitle: 'Concu pour les operations, le recrutement campus et les agences qui ont besoin de donnees fiables issues de chaque source.',
      items: [
        {
          title: 'Ingestion universelle',
          description: 'Deposez des PDF, DOCX, images ou collez des URL et tableurs pour centraliser toutes les offres.'
        },
        {
          title: 'Normalisation par IA',
          description: 'Detectez automatiquement poste, localisation, remuneration et prerequis avec un score de confiance.'
        },
        {
          title: 'Livraison verifiee',
          description: 'Diffusez des jeux de donnees prets dans ATS, CRM ou outils BI avec journaux daudit et validations.'
        }
      ]
    },
    useCases: {
      eyebrow: 'Cas pratiques',
      title: 'Des informations actionnables sur chaque canal.',
      description: 'Televersez des packs depuis vos emails, ajoutez des captures terrain ou synchronisez vos portails. Poussez des donnees propres vers Sheets, CRM ou automatisations en quelques minutes.',
      items: [
        {
          icon: 'star',
          title: 'Analyse de PDF',
          description: 'Decoupez des packs pluri-pages en attributs structures sans perdre tableaux ni mise en forme.'
        },
        {
          icon: 'camera',
          title: 'Capture terrain',
          description: 'Transformez photos ou captures mobiles en fiches de poste partageables et consultables.'
        },
        {
          icon: 'grid',
          title: 'Aggregation de tableurs',
          description: 'Fusionnez les colonnes de prestataires, partenaires ou ecoles en une vue de reference.'
        },
        {
          icon: 'spark',
          title: 'Benchmark remuneration',
          description: 'Comparez salaires et avantages par region pour piloter votre strategie doffre.'
        }
      ]
    },
    workflow: {
      eyebrow: 'Parcours dextraction',
      header: 'Suivez ces etapes pour transformer vos offres brutes en donnees fiables.',
      title: 'Analysez vos offres en quatre etapes guidees.',
      description: 'Deposez vos PDF ou images, laissez WorkInsight extraire chaque champ, verifiez les resultats normalises puis exportez un tableau pret a lemploi.',
      steps: [
        {
          label: 'Importer les sources',
          description: 'Deposez des PDF, DOCX, captures ou liens pour centraliser toutes vos offres.',
          hints: ['PDF et images', 'URLs'],
          action: 'Ajouter des fichiers'
        },
        {
          label: 'Lancer lextraction',
          description: 'LOCR et les parseurs detectent automatiquement titre, entreprise, localisation, emails et competences.',
          hints: ['OCR', 'Analyse'],
          action: 'Traiter les donnees'
        },
        {
          label: 'Verifier les resultats',
          description: 'Ouvrez le tableau de bord pour filtrer, rechercher et valider les fiches de poste structurees.',
          hints: ['Tableau de bord', 'Qualite'],
          action: 'Voir les resultats'
        },
        {
          label: 'Exporter et partager',
          description: 'Telechargez un fichier Excel ou CSV pret a etre partage avec votre equipe.',
          hints: ['Exports', 'Collaboration'],
          action: 'Exporter'
        }
      ]
    },
    robots: {
      eyebrow: 'Accelerateurs d import',
      title: 'Extrayez les donnees doffre en moins de 2 minutes.',
      description: 'Evitez la configuration manuelle avec des modeles adaptes aux formats recus quotidiennement par vos equipes.',
      templates: [
        {
          logo: 'pf',
          name: 'Pack offre PDF',
          description: 'Recuperez postes, fourchettes salariales, echeances et contacts recruteur depuis des PDF pluri-pages.',
          formats: ['CSV', 'XLSX', 'Google Sheets'],
          cta: 'Utiliser le modele'
        },
        {
          logo: 'sc',
          name: 'Lecteur de captures',
          description: 'Convertissez photos ou captures mobiles en descriptions de poste structurees.',
          formats: ['CSV', 'Airtable', 'Notion'],
          cta: 'Utiliser le modele'
        },
        {
          logo: 'wb',
          name: 'Crawler site carriere',
          description: 'Collectez les donnees doffres publiques ou privees sans copier coller manuel.',
          formats: ['CSV', 'HubSpot', 'Greenhouse'],
          cta: 'Utiliser le modele'
        },
        {
          logo: 'api',
          name: 'Connecteur personalise',
          description: 'Combinez tableurs internes, API ou depots FTP avec le parsing WorkInsight dans un seul flux.',
          formats: ['CSV', 'XLSX', 'JSON', 'Webhooks'],
          cta: 'Voir plus'
        }
      ]
    },
    matching: {
      eyebrow: 'Matching CV',
      title: 'Reliez vos CV aux offres extraites.',
      subtitle: 'Deposez un CV depuis le profil et WorkInsight note chaque offre extraite selon sa pertinence.',
      points: [
        {
          title: 'Un CV importe, disponible partout',
          description: 'Stockez le CV sur la page profil et retrouvez resume, competences et localisations pour le matching.'
        },
        {
          title: 'Scores de similarite fiables',
          description: 'La page des correspondances classe les offres selon la proximite des titres et des competences.'
        },
        {
          title: 'Pertinence explicable',
          description: 'Visualisez les competences alignees et les manques pour orienter vos actions.'
        }
      ],
      cta: 'Voir les correspondances'
    },
    faq: {
      heading: 'Questions frequentes',
      subtitle: 'Tout ce quil faut savoir pour accelerer vos operations de recrutement avec WorkInsight.',
      items: [
        {
          question: 'Quels formats de fichiers sont compatibles ?',
          answer: 'PDF, DOCX, CSV, XLSX, captures PNG ou JPG et URL directes sont pris en charge. Melangez-les dans un meme lot sans configuration.'
        },
        {
          question: 'Puis-je valider les champs extraits avant export ?',
          answer: 'Oui. Configurez des regles de controle, assignez les validations et tracez chaque approbation avec un journal complet.'
        },
        {
          question: 'Dois-je coder pour utiliser la plateforme ?',
          answer: 'Aucun code nest requis. Utilisez des modeles reutilisables ou creez-en via le designer visuel, puis etendez avec des scripts si besoin.'
        },
        {
          question: 'Nos donnees sont-elles securisees ?',
          answer: 'Les identifiants sont chiffres, chaque traitement est isole et chaque execution fournit une trace conforme.'
        },
        {
          question: 'Quel support est propose ?',
          answer: 'Accedez a un onboarding guide, des modeles optimises et un support prioritaire par des experts du recrutement.'
        }
      ]
    }
  }
};

@Component({
  standalone: true,
  selector: 'app-home-page',
  imports: [CommonModule, RouterModule],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})
export class HomePageComponent {
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly languageService = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  text: HomeCopy = HOME_COPY[this.languageService.getCurrentLanguage()];
  openFaqIndex: number | null = null;
  currentYear = new Date().getFullYear();

  constructor() {
    this.languageService.language$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(language => {
        this.text = HOME_COPY[language];
        this.openFaqIndex = null;
      });
  }

  get featureColumns(): HomeCopy['features']['items'] {
    return this.text.features.items;
  }

  get practicalExamples(): HomeCopy['useCases']['items'] {
    return this.text.useCases.items;
  }

  get automationSteps(): HomeCopy['workflow']['steps'] {
    return this.text.workflow.steps;
  }

  get workflowHeader(): string {
    return this.text.workflow.header;
  }

  get robotTemplates(): HomeCopy['robots']['templates'] {
    return this.text.robots.templates;
  }

  get faqs(): HomeCopy['faq']['items'] {
    return this.text.faq.items;
  }

  toggleFaq(index: number): void {
    if (index < 0 || index >= this.text.faq.items.length) {
      return;
    }
    this.openFaqIndex = this.openFaqIndex === index ? null : index;
  }

  startExtracting(): void {
    const target = this.session.getCurrentUserId() ? '/upload' : '/signup';
    this.router.navigate([target]);
  }

  connectWorkspace(): void {
    const target = this.session.getCurrentUserId() ? '/results' : '/signin';
    this.router.navigate([target]);
  }

  viewMatches(): void {
    const target = this.session.getCurrentUserId() ? '/matches' : '/signup';
    this.router.navigate([target]);
  }
}
