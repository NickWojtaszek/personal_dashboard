

import React from 'react';
import type { AppInfo, ProjectInfo, PropertyInfo, InsuranceInfo, ContractInfo, InvoiceInfo, VehicleInfo, ShoppingItem } from './types';
import { v4 as uuidv4 } from 'uuid';

const LauncherIcon = (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.82m5.84-2.56a6 6 0 0 0-7.38-5.84m2.56 5.84L6.13 20.25m9.24-9.24a6 6 0 0 0-5.84-7.38v4.82m5.84 2.56l-2.56-5.84m-5.84 7.38L3.75 15.59m9.24 2.12c.51-.13.98-.32 1.41-.56l-2.56-5.84m-5.84 7.38a6 6 0 0 1-2.12-9.24m9.24 9.24L15.59 3.75" /></svg>);
const ScriptIcon = (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" /></svg>);
const TemplateIcon = (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m9.75 11.375c.621 0 1.125-.504 1.125-1.125v-9.25a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /></svg>);
const PropertyIcon = (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6h1.5m-1.5 3h1.5m-1.5 3h1.5M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>);
const MicIcon = (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 0 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>);
const CalendarIcon = (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0h18M12 12.75h.008v.008H12v-.008Z" /></svg>);
const DebateIcon = (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 0 1-2.53-.388m-5.12-3.532a9.753 9.753 0 0 1-2.008-5.118c0-4.556 4.03-8.25 9-8.25a9.753 9.753 0 0 1 8.369 5.102" /></svg>);
const MealIcon = (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.362-3.797A8.25 8.25 0 0 1 15.362 5.214Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 15a2.25 2.25 0 0 0 2.25-2.25V7.5a2.25 2.25 0 0 0-4.5 0v5.25A2.25 2.25 0 0 0 12 15Z" /></svg>);
const RadiologyIcon = (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path d="M12 14.25a.75.75 0 0 1-.75-.75V12a.75.75 0 0 1 1.5 0v1.5a.75.75 0 0 1-.75.75Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 13.5h-3A.75.75 0 0 0 9.75 15v3A.75.75 0 0 0 10.5 18.75h3a.75.75 0 0 0 .75-.75v-3a.75.75 0 0 0-.75-.75Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25c0-1.05.6-1.95 1.5-2.43V3.75A1.5 1.5 0 0 1 5.25 2.25h13.5a1.5 1.5 0 0 1 1.5 1.5v2.07c.9.48 1.5 1.38 1.5 2.43v9a2.25 2.25 0 0 1-2.25 2.25H4.5A2.25 2.25 0 0 1 2.25 17.25v-9Z" /></svg>);
const GmailScriptIcon = (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 0 1-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 0 0 1.183 1.981l6.478 3.488m8.839 2.51-4.66-2.51m0 0-1.023-.55a2.25 2.25 0 0 0-2.134 0l-1.022.55m0 0-4.661 2.51m16.5 1.615a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V8.844a2.25 2.25 0 0 1 1.183-1.981l7.5-4.039a2.25 2.25 0 0 1 2.134 0l7.5 4.039a2.25 2.25 0 0 1 1.183 1.98V19.5Z" /></svg>);
const GlobeIcon = (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c1.356 0 2.648-.283 3.845-.783A9.005 9.005 0 0 0 12 3c-1.356 0-2.648.283-3.845.783A9.005 9.005 0 0 0 12 21Zm-3.845-1.5c.346.124.708.225 1.084.292M15.845 19.5c-.346.124-.708.225-1.084.292m-2.916-1.508a.993.993 0 0 0 0 1.416m-2.916-4.524a.993.993 0 0 0 0 1.416m11.664 0a.993.993 0 0 0 0-1.416m-5.832-1.416a.993.993 0 0 0 0 1.416" /></svg>);
const SpineIcon = (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l-7.5 7.5 7.5 7.5" /></svg>);
const PropertySuiteIcon = (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>);

export const ICONS: { [key: string]: React.ReactNode } = {
    'LauncherIcon': LauncherIcon,
    'ScriptIcon': ScriptIcon,
    'TemplateIcon': TemplateIcon,
    'PropertyIcon': PropertyIcon,
    'MicIcon': MicIcon,
    'CalendarIcon': CalendarIcon,
    'DebateIcon': DebateIcon,
    'MealIcon': MealIcon,
    'RadiologyIcon': RadiologyIcon,
    'GmailScriptIcon': GmailScriptIcon,
    'GlobeIcon': GlobeIcon,
    'SpineIcon': SpineIcon,
    'PropertySuiteIcon': PropertySuiteIcon
};

export const APP_GROUPS: string[] = [
    'AI', 'Tools', 'Development', 'Property', 'Healthcare',
    'Communication', 'Productivity', 'Personal', 'Research', 
    'Education', 'Design', 'Finance'
];

export const INITIAL_APPS: AppInfo[] = [
    {
        id: '1',
        name: 'Personal App Launcher',
        description: 'A customizable launcher for your personal web applications, featuring an admin mode for editing app links and details.',
        url: '#',
        icon: 'LauncherIcon',
        groups: ['Tools', 'Development'],
    },
    {
        id: '2',
        name: 'Gmail Script Generator',
        description: 'Generate Google Apps Scripts for extracting email data from Gmail into a Google Sheet.',
        url: '#',
        icon: 'GmailScriptIcon',
        groups: ['Tools', 'Development', 'Communication'],
    },
    {
        id: '3',
        name: 'Everlight Templates',
        description: 'A collection of beautifully designed templates for presentations, documents, and websites.',
        url: '#',
        icon: 'TemplateIcon',
        groups: ['Design', 'Productivity'],
    },
    {
        id: '4',
        name: 'AI Property Management Hub',
        description: 'An intelligent platform to streamline property management and track maintenance requests with AI-powered insights.',
        url: '#',
        icon: 'PropertyIcon',
        groups: ['AI', 'Property', 'Tools'],
    },
    {
        id: '5',
        name: 'SpeakSync XR',
        description: 'A powerful report creation tool that combines a template manager with real-time speech-to-text transcription.',
        url: '#',
        icon: 'MicIcon',
        groups: ['AI', 'Productivity', 'Tools'],
    },
    {
        id: '6',
        name: 'AI Studio Shift Scheduler',
        description: 'A sophisticated shift planning and tracking application to help users meet monthly earning goals.',
        url: '#',
        icon: 'CalendarIcon',
        groups: ['AI', 'Productivity', 'Finance'],
    },
    {
        id: '7',
        name: 'AI Debate Synthesis',
        description: 'An advanced AI-powered debate system that uses the Walt Disney Method to analyze, refine, and synthesize ideas.',
        url: '#',
        icon: 'DebateIcon',
        groups: ['AI', 'Research'],
    },
    {
        id: '8',
        name: 'AI Weekly Meal Planner',
        description: "An AI-powered app to generate a week's worth of recipes from a list of ingredients.",
        url: '#',
        icon: 'MealIcon',
        groups: ['AI', 'Personal', 'Healthcare'],
    },
    {
        id: '9',
        name: 'AI Radiology Report Generator',
        description: 'An advanced tool for radiologists to generate structured medical reports by dictating clinical findings.',
        url: '#',
        icon: 'RadiologyIcon',
        groups: ['AI', 'Healthcare'],
    },
    {
        id: '10',
        name: 'Google Apps Script Generator for Gmail',
        description: 'A tool to create personalized Google Apps Scripts for managing and archiving Gmail messages.',
        url: '#',
        icon: 'ScriptIcon',
        groups: ['Tools', 'Development', 'Communication'],
    },
    {
        id: '11',
        name: 'Global Radiologist Work-Life Modeler',
        description: 'An application for a remote radiologist to find ideal work locations by modeling shifts against global time zones.',
        url: '#',
        icon: 'GlobeIcon',
        groups: ['Healthcare', 'Tools'],
    },
    {
        id: '12',
        name: 'Interactive Spine Diagram',
        description: 'An interactive medical diagram of a lumbar spine disc for educational purposes.',
        url: '#',
        icon: 'SpineIcon',
        groups: ['Healthcare', 'Education'],
    },
    {
        id: '13',
        name: 'Property Management Suite',
        description: 'A comprehensive suite of tools for managing properties, tenants, and finances.',
        url: '#',
        icon: 'PropertySuiteIcon',
        groups: ['Property', 'Tools'],
    }
];


export const PROJECT_GROUPS: string[] = [
    'Development', 'ELR', 'UCK', 'Property', 'Legal', 
    'Finance', 'Research', 'Communication', 'Healthcare',
    'Education', 'Tools', 'Knowledge', 'Personal'
];

export const GROUP_COLORS = [
    'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
    'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300',
    'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300',
    'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
];

const simpleHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

export const getColorForGroup = (groupName: string): string => {
    const hash = simpleHash(groupName);
    const index = hash % GROUP_COLORS.length;
    return GROUP_COLORS[index];
};


export const INITIAL_PROJECTS: ProjectInfo[] = [
    // Development
    { id: 'proj-1', name: 'AI Studio Code Review & Testing Assistant', description: 'An AI assistant to review code for quality and generate test cases.', url: 'https://claude.ai/project/code-review-assistant', lastUpdated: '2 hours ago', groups: ['Development', 'Tools'] },
    { id: 'proj-2', name: 'AI Studio Assistant', description: 'General purpose AI assistant integrated into the development studio.', url: 'https://claude.ai/project/studio-assistant', lastUpdated: '1 day ago', groups: ['Development', 'Tools'] },
    { id: 'proj-3', name: 'Report Builder', description: 'Dynamically build and customize reports from various data sources.', url: 'https://claude.ai/project/report-builder', lastUpdated: '3 days ago', groups: ['Development'] },
    { id: 'proj-4', name: 'Template Manager', description: 'Manage and organize document and code templates.', url: 'https://claude.ai/project/template-manager', lastUpdated: '5 days ago', groups: ['Development', 'Tools'] },
    { id: 'proj-5', name: 'NLP Parser', description: 'A project for parsing and understanding natural language text.', url: 'https://claude.ai/project/nlp-parser', lastUpdated: '1 week ago', groups: ['Development', 'Research'] },
    { id: 'proj-6', name: 'Coding', description: 'A general-purpose project for writing and testing new code.', url: 'https://claude.ai/project/coding-scratchpad', lastUpdated: '6 hours ago', groups: ['Development'] },
    { id: 'proj-7', name: 'Programming', description: 'Advanced programming concepts and algorithm development.', url: 'https://claude.ai/project/programming-concepts', lastUpdated: '2 weeks ago', groups: ['Development', 'Education'] },
    { id: 'proj-8', name: 'Forms', description: 'A project for creating and managing dynamic web forms.', url: 'https://claude.ai/project/forms-generator', lastUpdated: '1 month ago', groups: ['Development'] },
    
    // ELR
    { id: 'proj-9', name: 'ELR Appraisal', description: 'Electronic Lodgement and Reporting appraisal system.', url: 'https://claude.ai/project/elr-appraisal', lastUpdated: '4 days ago', groups: ['ELR'] },
    { id: 'proj-10', name: 'ELR Corrections', description: 'System for managing corrections in ELR submissions.', url: 'https://claude.ai/project/elr-corrections', lastUpdated: '1 week ago', groups: ['ELR'] },
    { id: 'proj-11', name: 'ELR Templates', description: 'Template management for ELR documents.', url: 'https://claude.ai/project/elr-templates', lastUpdated: '2 weeks ago', groups: ['ELR', 'Tools'] },
    { id: 'proj-12', name: 'ELR Work Correspondence', description: 'Managing communication related to ELR tasks.', url: 'https://claude.ai/project/elr-correspondence', lastUpdated: '3 days ago', groups: ['ELR', 'Communication'] },
    { id: 'proj-13', name: 'ELR Discrepancies', description: 'Tracking and resolving discrepancies in electronic reports.', url: 'https://claude.ai/project/elr-discrepancies', lastUpdated: '10 days ago', groups: ['ELR'] },
    { id: 'proj-14', name: 'ELR Contract', description: 'Analysis and management of ELR-related contracts.', url: 'https://claude.ai/project/elr-contract', lastUpdated: '1 month ago', groups: ['ELR', 'Legal'] },

    // UCK
    { id: 'proj-15', name: 'UCK Corrections', description: 'Handling corrections for UCK-related data.', url: 'https://claude.ai/project/uck-corrections', lastUpdated: '6 days ago', groups: ['UCK'] },
    { id: 'proj-16', name: 'UCK Rozliczenia', description: 'Financial settlements and accounting for UCK.', url: 'https://claude.ai/project/uck-rozliczenia', lastUpdated: '12 days ago', groups: ['UCK', 'Finance'] },

    // Property
    { id: 'proj-17', name: 'Brisbane One', description: 'Property development project management for Brisbane One tower.', url: 'https://claude.ai/project/brisbane-one', lastUpdated: '1 day ago', groups: ['Property'] },
    { id: 'proj-18', name: 'Property Investment', description: 'Analysis and modeling for property investment opportunities.', url: 'https://claude.ai/project/property-investment', lastUpdated: '8 days ago', groups: ['Property', 'Finance'] },
    { id: 'proj-19', name: 'Rossmore Court', description: 'Management and planning for the Rossmore Court property.', url: 'https://claude.ai/project/rossmore-court', lastUpdated: '3 weeks ago', groups: ['Property'] },

    // Communication
    { id: 'proj-20', name: 'Email Review and Action', description: 'AI-powered tool to categorize and suggest actions for incoming emails.', url: 'https://claude.ai/project/email-review', lastUpdated: '4 hours ago', groups: ['Communication', 'Tools'] },
    { id: 'proj-21', name: 'Emails', description: 'A general project for drafting and managing important email communications.', url: 'https://claude.ai/project/emails', lastUpdated: '1 day ago', groups: ['Communication'] },
    
    // Research
    { id: 'proj-22', name: 'Power Points and Parallel Universes', description: 'Theoretical research on advanced physics concepts.', url: 'https://claude.ai/project/parallel-universes', lastUpdated: '2 days ago', groups: ['Research'] },
    { id: 'proj-23', name: 'Study Mode', description: 'A focused environment for deep study and research on various topics.', url: 'https://claude.ai/project/study-mode', lastUpdated: '9 days ago', groups: ['Research', 'Education'] },
    { id: 'proj-24', name: 'Kasia badania', description: 'Research project for Kasia, details confidential.', url: 'https://claude.ai/project/kasia-badania', lastUpdated: '15 days ago', groups: ['Research'] },
    { id: 'proj-25', name: 'Publication Review', description: 'Reviewing and summarizing scientific publications.', url: 'https://claude.ai/project/publication-review', lastUpdated: '1 week ago', groups: ['Research'] },

    // Legal
    { id: 'proj-26', name: 'Law and Company', description: 'Research and documentation related to corporate law.', url: 'https://claude.ai/project/law-and-company', lastUpdated: '2 weeks ago', groups: ['Legal'] },
    { id: 'proj-27', name: 'Contract Analysis', description: 'AI tool for analyzing and summarizing legal contracts.', url: 'https://claude.ai/project/contract-analysis', lastUpdated: '1 month ago', groups: ['Legal', 'Tools'] },

    // Finance
    { id: 'proj-28', name: 'Bills', description: 'Tracking and management of personal and business bills.', url: 'https://claude.ai/project/bills', lastUpdated: '5 days ago', groups: ['Finance', 'Personal'] },
    { id: 'proj-29', name: 'Insurance: Toyota Hilux', description: 'Managing insurance policies and claims for the company vehicle.', url: 'https://claude.ai/project/insurance-hilux', lastUpdated: '18 days ago', groups: ['Finance'] },

    // Knowledge
    { id: 'proj-30', name: 'Aristotle Knowledge Base', description: 'A comprehensive knowledge base built on Aristotelian principles.', url: 'https://claude.ai/project/aristotle-kb', lastUpdated: '3 days ago', groups: ['Knowledge', 'Research'] },
    { id: 'proj-31', name: 'Aristotle', description: 'Core research project on the works of Aristotle.', url: 'https://claude.ai/project/aristotle', lastUpdated: '1 week ago', groups: ['Knowledge', 'Research'] },
    { id: 'proj-32', name: 'SOP ARISTOTLE', description: 'Standard Operating Procedures for the Aristotle project.', url: 'https://claude.ai/project/sop-aristotle', lastUpdated: '2 weeks ago', groups: ['Knowledge'] },

    // Personal
    { id: 'proj-33', name: 'Holidays', description: 'Planning and organizing upcoming holidays and trips.', url: 'https://claude.ai/project/holidays', lastUpdated: '1 day ago', groups: ['Personal'] },
];

export const PROPERTY_GROUPS: string[] = ['UK', 'Poland', 'Australia', 'Residential', 'Commercial', 'Land'];

export const INITIAL_PROPERTIES: PropertyInfo[] = [
    { 
        id: 'prop-1', 
        name: '5 Cable Walk', 
        location: 'London, UK', 
        url: '#', 
        groups: ['UK', 'Residential'],
        overview: {
            address: '5 Cable Walk, Greenwich, London, SE10 0TP',
            propertyType: 'Apartment',
            configuration: { beds: 2, baths: 2, parking: 1, storage: 1 },
        },
        details: {
            complexName: 'Enderby Wharf',
            unitLotNumber: 'Apt 5, Caldesi House',
            features: ['River View', 'Balcony', 'Concierge', 'Gym Access'],
        },
        financials: {
            transactions: [
                { id: uuidv4(), type: 'income', description: 'Monthly Rent', amount: 2800 },
                { id: uuidv4(), type: 'expense', description: 'Strata/Body Corp', amount: 400 },
                { id: uuidv4(), type: 'expense', description: 'Council Rates', amount: 150 },
                { id: uuidv4(), type: 'expense', description: 'Insurance', amount: 50 },
                { id: uuidv4(), type: 'expense', description: 'Management Fees', amount: 280 },
                { id: uuidv4(), type: 'expense', description: 'Maintenance Costs', amount: 100 },
            ]
        },
        management: {
            agent: 'Chestertons', 
            managerContact: 'jane.doe@chestertons.com', 
            agreementDetails: '10% Full Management' 
        },
        managementStructure: {
            hasComplexManagement: true,
            managingAgent: {
                name: 'Sterling Estates Management Ltd',
                address: '1st Floor, Compton House, 23-33 Church Road, Stanmore, HA7 4AR',
                bank: 'HSBC',
                sortCode: '400707',
                accountNo: '93665402'
            },
            landlord: {
                name: 'Enderby Wharf LLP',
                address: 'Here East, 13 East Bay Lane, 3rd Floor Press Centre, London, E15 2GW'
            },
            rtmCompany: {
                name: 'Enderby Wharf RTM Company Limited',
                address: 'Management Office, 6 Cable Walk, London, SE10 0TP'
            }
        },
        mortgage: {
            type: 'Fixed',
            renewalDate: '2028-06-01',
            outstandingBalance: 350000,
            payments: [
                { id: uuidv4(), date: '2024-07-01', amount: 1500, principal: 700, interest: 800 },
                { id: uuidv4(), date: '2024-06-01', amount: 1500, principal: 695, interest: 805 },
                { id: uuidv4(), date: '2024-05-01', amount: 1500, principal: 690, interest: 810 },
            ]
        },
        operations: {
            tenancy: {
                agreements: [
                    { id: uuidv4(), leaseStart: '2023-08-01', leaseEnd: '2025-07-31', document: { name: 'Tenancy_Agreement_2023.pdf', url: '#' } },
                    { id: uuidv4(), leaseStart: '2022-08-01', leaseEnd: '2023-07-31', document: { name: 'Tenancy_Agreement_2022.pdf', url: '#' } }
                ]
            },
            maintenance: {
                jobs: [
                    { id: uuidv4(), date: '2024-06-05', description: 'Repair sticky balcony door lock', cost: 85.00, document: { name: 'Locksmith_Invoice_Jun24.pdf', url: '#' } },
                    { id: uuidv4(), date: '2024-03-15', description: 'Fix minor leak under kitchen sink', cost: 120.50, document: { name: 'Plumbing_Invoice_Mar24.pdf', url: '#' } },
                ],
                equipment: [
                    { id: uuidv4(), date: '2023-01-20', description: 'New Bosch Washing Machine', cost: 550.00, document: { name: 'Washing_Machine_Warranty.pdf', url: '#' } },
                    { id: uuidv4(), date: '2022-09-01', description: 'Install new smoke alarms (2x)', cost: 75.00, document: { name: 'Smoke_Alarm_Invoice.pdf', url: '#' } },
                ]
            },
            leaseholdCharges: {
                serviceCharges: [
                    { id: uuidv4(), year: 2024, amountDue: 4200.50, amountPaid: 4200.50, dueDate: '2024-03-31', paymentDetails: 'HSBC | 40-07-07 | 93665402' },
                    { id: uuidv4(), year: 2023, amountDue: 3950.00, amountPaid: 3950.00, dueDate: '2023-03-31', paymentDetails: 'HSBC | 40-07-07 | 93665402' }
                ],
                groundRent: [
                    { id: uuidv4(), year: 2024, amountDue: 750.00, amountPaid: 0, dueDate: '2024-12-25', paymentDetails: 'https://pay.groundrent.com/enderby' },
                    { id: uuidv4(), year: 2023, amountDue: 750.00, amountPaid: 750.00, dueDate: '2023-12-25', paymentDetails: 'https://pay.groundrent.com/enderby' }
                ],
                councilTax: [
                    { id: uuidv4(), year: 2024, amountDue: 1800.00, amountPaid: 1800.00, dueDate: '2024-04-01', paidByTenant: true, paymentDetails: 'Paid directly by tenant to council.' }
                ]
            },
            compliance: {
                propertyInspection: {
                    last: '2024-02-15',
                    next: '2025-02-15'
                },
                eicr: {
                    checks: [
                        { id: uuidv4(), date: '2022-09-01', document: { name: 'EICR_Report_2022.pdf', url: '#' } }
                    ],
                    next: '2027-09-01',
                },
                gasSafety: {
                    checks: [
                        { id: uuidv4(), date: '2024-07-15', document: { name: 'Gas_Safety_Cert_2024.pdf', url: '#' } },
                        { id: uuidv4(), date: '2023-07-10', document: { name: 'Gas_Safety_Cert_2023.pdf', url: '#' } }
                    ],
                    next: '2025-07-15'
                },
                insurance: {
                    policies: [
                        { id: uuidv4(), startDate: '2023-12-01', endDate: '2024-12-01', document: { name: 'Insurance_Policy_23-24.pdf', url: '#' } },
                        { id: uuidv4(), startDate: '2022-12-01', endDate: '2023-11-30', document: { name: 'Insurance_Policy_22-23.pdf', url: '#' } }
                    ]
                },
                smokeAlarms: {
                    lastChecked: '2024-01-10',
                    nextCheck: '2025-01-10'
                }
            },
        },
        documents: [
            { name: 'Lease Agreement', url: '#' },
            { name: 'Insurance Policy', url: '#' },
            { name: 'EICR Certificate', url: '#' },
            { name: 'Gas Safety Certificate', url: '#' },
        ],
        contacts: [
            { role: 'Property Manager', name: 'Jane Doe', contact: 'jane.doe@chestertons.com' },
            { role: 'Insurance Provider', name: 'Aviva', contact: '0800 051 2345' },
            { role: 'Strata Manager', name: 'FirstPort', contact: 'contact@firstport.co.uk' },
        ],
        notes: "Initial inspection revealed a minor leak under the kitchen sink, which was repaired on 2024-03-15.\n\nTenant reported a sticky balcony door on 2024-06-01; scheduled for maintenance.\n\nConsider replacing the boiler in the next 2-3 years.",
        correspondence: [
            {
                id: uuidv4(),
                date: '2024-07-22',
                from: 'Sterling Estates Management',
                to: 'Me',
                subject: 'Service Charge Demand - Q3 2024',
                body: `Dear Resident,\n\nThis is a formal demand for the service charge for the period of 1st July 2024 to 30th September 2024.\n\nThe amount due is £1050.25.\n\nPlease ensure payment is made by 1st August 2024 to the usual account.\n\nKind regards,\nSterling Estates Management`
            },
            {
                id: uuidv4(),
                date: '2024-06-15',
                from: 'Jane Doe (Chestertons)',
                to: 'Me',
                subject: 'Re: Sticky Balcony Door',
                body: `Hi,\n\nJust to confirm, we have instructed the locksmith to attend the property on Monday 17th June between 9am and 12pm to repair the balcony door lock.\n\nThey will collect keys from our office.\n\nThanks,\nJane`
            }
        ]
    },
    { id: 'prop-2', name: 'Flat 4, 58 Earls Avenue', location: 'Folkestone, UK', url: '#', groups: ['UK', 'Residential'] },
    { id: 'prop-3', name: 'Cybernetyki 7D/13', location: 'Warsaw, Poland', url: '#', groups: ['Poland', 'Residential'] },
    { id: 'prop-4', name: 'Nowolipie 3/8', location: 'Warsaw, Poland', url: '#', groups: ['Poland', 'Residential'] },
    { id: 'prop-5', name: 'Rosola 26A/1', location: 'Warsaw, Poland', url: '#', groups: ['Poland', 'Residential'] },
    { 
        id: 'prop-6', 
        name: '1 Cordelia Street', 
        location: 'Brisbane, Australia', 
        url: '#', 
        groups: ['Australia', 'Residential'],
        operations: {
            leaseholdCharges: {
                councilTax: [
                    { id: uuidv4(), year: 2024, amountDue: 1600.00, amountPaid: 1600.00, dueDate: '2024-08-31', paymentDetails: 'Brisbane City Council' }
                ]
            }
        }
    },
];

export const INSURANCE_GROUPS: string[] = ['Property', 'Vehicle', 'Health', 'Life', 'Business', 'UK', 'Australia', 'Poland'];

export const INITIAL_INSURANCE_POLICIES: InsuranceInfo[] = [
    {
        id: 'ins-1',
        name: 'Home Insurance - 5 Cable Walk',
        provider: 'Aviva',
        renewalDate: 'Dec 2025',
        groups: ['Property', 'UK'],
        policyType: 'Home & Contents',
        status: 'Pending',
        policyholder: 'Mikolaj Wojtaszek',
        currency: 'GBP',
        notes: 'Property: 5 Cable Walk, Greenwich, London SE10 0TP. Upload policy PDF to auto-fill details.'
    },
    {
        id: 'ins-2',
        name: 'Car Insurance - Toyota Hilux',
        provider: 'Virgin Money',
        renewalDate: 'Mar 2027',
        groups: ['Vehicle', 'Australia'],
        policyType: 'Comprehensive Car Insurance',
        status: 'Active',
        policyholder: 'Mikolaj Wojtaszek',
        premiumAmount: 145.62,
        paymentFrequency: 'Monthly',
        currency: 'AUD',
        policyNumber: '120251843 05',
        startDate: '2026-03-12',
        endDate: '2027-03-11',
        lastReviewed: '2026-03-12',
        deductible: 1000,
        contactNumber: '1800 724 678',
        coverageSummary: 'Comprehensive cover for a 2020 Toyota Hilux Sr5, insured for Market Value.',
        notes: 'Excluded drivers: Any Household Member not listed above, Any person under 40 years of age. Additional excesses apply to the Basic Excess when the car is driven by a person who has not held a full or open Australian licence for 2 or more years ($500), or is not listed as a driver on the policy ($600). Optional benefits (Accident Hire Car, Choice of Repairer, Reduced Window Glass Excess) are not included.',
        history: [
            {
                id: 'hist-car-1',
                periodStart: '2025-03-12',
                periodEnd: '2026-03-11',
                premiumAmount: 138.50,
                paymentFrequency: 'Monthly',
                provider: 'Virgin Money',
                policyNumber: '120251843 04',
                currency: 'AUD',
                archivedAt: '2026-03-12T00:00:00.000Z',
            },
            {
                id: 'hist-car-2',
                periodStart: '2024-03-12',
                periodEnd: '2025-03-11',
                premiumAmount: 125.30,
                paymentFrequency: 'Monthly',
                provider: 'Virgin Money',
                policyNumber: '120251843 03',
                currency: 'AUD',
                archivedAt: '2025-03-12T00:00:00.000Z',
            },
        ],
    },
    {
        id: 'ins-3',
        name: 'Landlord Insurance - 58 Earls Ave',
        provider: '',
        renewalDate: '',
        groups: ['Property', 'UK'],
        policyType: '',
        status: 'Pending',
        policyholder: 'Mikolaj Wojtaszek',
        currency: 'GBP',
        notes: 'Property: Flat 4, 58 Earls Avenue, Folkestone. Upload policy PDF to auto-fill details.'
    },
    {
        id: 'ins-4',
        name: 'Landlord Building Insurance - 16 Hillview Dr',
        provider: 'Terri Scheer (AAI Limited)',
        renewalDate: 'Apr 2027',
        groups: ['Property', 'Australia'],
        policyType: 'Landlord Residential Building Insurance',
        status: 'Active',
        policyholder: 'Mikolaj Wojtaszek',
        premiumAmount: 3570.55,
        paymentFrequency: 'Annually',
        currency: 'AUD',
        policyNumber: 'TS4771080RBI',
        coverageAmount: 900000,
        startDate: '2026-04-02',
        endDate: '2027-04-02',
        lastReviewed: '2026-03-12',
        deductible: 1000,
        contactNumber: '1800 804 016',
        coverageSummary: 'Building insured for $900,000. Liability to Other $20,000,000. Weekly rent cover $1,350.',
        notes: 'Mortgagee: HSBC Bank Australia Limited. Managing Agent: McGrath - Noosa. Excess: Tenant damage $1,000, Earthquake/Tsunami $1,000, Building damage $1,000, Loss of rent/Liability $0. Property: 16 Hillview Dr, Buderim QLD 4556.',
        history: [
            {
                id: 'hist-ts-bld-1',
                periodStart: '2025-04-02',
                periodEnd: '2026-04-02',
                premiumAmount: 3280.00,
                paymentFrequency: 'Annually',
                coverageAmount: 850000,
                provider: 'Terri Scheer (AAI Limited)',
                policyNumber: 'TS4771080RBI',
                currency: 'AUD',
                archivedAt: '2026-04-02T00:00:00.000Z',
            },
        ],
    },
    {
        id: 'ins-5',
        name: 'Landlord Contents Insurance - 16 Hillview Dr',
        provider: 'Terri Scheer (AAI Limited)',
        renewalDate: 'Apr 2027',
        groups: ['Property', 'Australia'],
        policyType: 'Landlord Preferred Policy',
        status: 'Active',
        policyholder: 'Mikolaj Wojtaszek',
        premiumAmount: 384.75,
        paymentFrequency: 'Annually',
        currency: 'AUD',
        policyNumber: 'TS3729665LPP',
        coverageAmount: 70000,
        startDate: '2026-04-02',
        endDate: '2027-04-02',
        lastReviewed: '2026-03-12',
        deductible: 100,
        contactNumber: '1800 804 016',
        coverageSummary: 'Contents/Building insured for $70,000. Liability to Other $20,000,000. Weekly rent cover up to $1,500.',
        notes: 'Managing Agent: McGrath - Noosa. Excess: Loss of rent $0, Tenant damage $500, Scorching/pet damage $250, Earthquake/Tsunami $200, Other claims $100. Property: 16 Hillview Dr, Buderim QLD 4556.'
    },
    {
        id: 'ins-6',
        name: 'Property Insurance - Cybernetyki 7D/13',
        provider: '',
        renewalDate: '',
        groups: ['Property', 'Poland'],
        policyType: '',
        status: 'Pending',
        policyholder: 'Mikolaj Wojtaszek',
        currency: 'PLN',
        notes: 'Property: Cybernetyki 7D/13, Warsaw, Poland. Upload policy PDF to auto-fill details.'
    },
    {
        id: 'ins-7',
        name: 'Property Insurance - Nowolipie 3/8',
        provider: '',
        renewalDate: '',
        groups: ['Property', 'Poland'],
        policyType: '',
        status: 'Pending',
        policyholder: 'Mikolaj Wojtaszek',
        currency: 'PLN',
        notes: 'Property: Nowolipie 3/8, Warsaw, Poland. Upload policy PDF to auto-fill details.'
    },
    {
        id: 'ins-8',
        name: 'Property Insurance - Rosola 26A/1',
        provider: '',
        renewalDate: '',
        groups: ['Property', 'Poland'],
        policyType: '',
        status: 'Pending',
        policyholder: 'Mikolaj Wojtaszek',
        currency: 'PLN',
        notes: 'Property: Rosola 26A/1, Warsaw, Poland. Upload policy PDF to auto-fill details.'
    },
    {
        id: 'ins-9',
        name: 'Home Insurance - 1 Cordelia St',
        provider: '',
        renewalDate: '',
        groups: ['Property', 'Australia'],
        policyType: '',
        status: 'Pending',
        policyholder: 'Mikolaj Wojtaszek',
        currency: 'AUD',
        notes: 'Property: 1 Cordelia St, South Brisbane QLD 4101. Upload policy PDF to auto-fill details.'
    },
];

export const CONTRACT_GROUPS: string[] = ['Medical', 'Service', 'Employment', 'Property', 'UK', 'Australia', 'Poland'];

export const INITIAL_CONTRACTS: ContractInfo[] = [];

export const PURCHASE_INVOICE_CATEGORIES: string[] = ['Office Supplies', 'Software & Subscriptions', 'Hardware', 'Utilities', 'Travel & Accommodation', 'Marketing', 'Professional Services'];
export const INVOICE_LOCATIONS: string[] = ['UK', 'PL', 'AU', 'Other'];

export const INITIAL_INVOICES: InvoiceInfo[] = [
    {
        id: 'inv-1',
        description: 'M2 MacBook Air',
        purchaseDate: '2024-07-20',
        amount: 1499.00,
        groups: ['Hardware'],
        location: 'UK',
    },
    {
        id: 'inv-2',
        description: 'Figma Subscription - Annual',
        purchaseDate: '2024-07-15',
        amount: 144.00,
        groups: ['Software & Subscriptions'],
        location: 'UK',
    },
    {
        id: 'inv-3',
        description: 'Ergonomic Office Chair',
        purchaseDate: '2024-07-10',
        amount: 450.50,
        groups: ['Office Supplies'],
        location: 'PL',
    },
    {
        id: 'inv-4',
        description: 'British Gas - Q2 Utilities',
        purchaseDate: '2024-07-01',
        amount: 250.75,
        groups: ['Utilities'],
        location: 'UK',
    },
];

export const VEHICLE_GROUPS: string[] = ['Personal', 'Work', 'Australia'];

export const INITIAL_VEHICLES: VehicleInfo[] = [
    {
        id: 'veh-1',
        name: 'Toyota Hilux',
        rego: '420BE8',
        state: 'QLD',
        expiryDate: '2026-08-23',
        startDate: '2026-02-23',
        groups: ['Work', 'Australia'],
        make: 'Toyota',
        model: 'Hilux',
        bodyType: 'Utility',
        purpose: 'Private',
        year: 2022,
        currency: 'AUD',
        totalAmount: 455.10,
        ctpAmount: 226.40,
        registrationFee: 186.40,
        trafficImprovementFee: 32.50,
        term: '6 Months',
        ctpInsurer: 'QBE',
        ctpClass: '6',
        status: 'Current',
        history: [
            {
                id: 'veh-1-hist-1',
                periodStart: '2025-08-23',
                periodEnd: '2026-02-23',
                totalAmount: 440.50,
                ctpAmount: 218.20,
                registrationFee: 182.00,
                term: '6 Months',
                ctpInsurer: 'QBE',
                currency: 'AUD',
                archivedAt: '2026-02-23T00:00:00.000Z',
            },
        ],
    },
    {
        id: 'veh-2',
        name: 'Honda Civic',
        rego: '948VIA',
        state: 'QLD',
        expiryDate: '2026-08-18',
        startDate: '2026-02-18',
        groups: ['Personal', 'Australia'],
        make: 'Honda',
        model: 'Civic',
        bodyType: 'Hatchback',
        purpose: 'Private',
        currency: 'AUD',
        totalAmount: 431.10,
        ctpAmount: 202.40,
        registrationFee: 186.40,
        trafficImprovementFee: 32.50,
        term: '6 Months',
        ctpInsurer: 'Allianz',
        ctpClass: '1',
        status: 'Current',
        history: [
            {
                id: 'veh-2-hist-1',
                periodStart: '2025-08-18',
                periodEnd: '2026-02-18',
                totalAmount: 425.80,
                ctpAmount: 198.60,
                registrationFee: 182.00,
                term: '6 Months',
                ctpInsurer: 'Allianz',
                currency: 'AUD',
                archivedAt: '2026-02-18T00:00:00.000Z',
            },
        ],
    },
];

export const SHOPPING_CATEGORIES: string[] = ['Groceries', 'Household', 'Electronics', 'Clothing', 'Personal Care', 'Other'];

export const INITIAL_SHOPPING_ITEMS: ShoppingItem[] = [
    { id: 'shop-1', name: 'Milk', category: 'Groceries', quantity: '2L', checked: false },
    { id: 'shop-2', name: 'Eggs', category: 'Groceries', quantity: '12', checked: false },
    { id: 'shop-3', name: 'Dishwasher Tablets', category: 'Household', quantity: '1 pack', checked: true },
    { id: 'shop-4', name: 'Batteries (AA)', category: 'Electronics', quantity: '4', checked: false },
];