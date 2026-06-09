import * as clarificationPrompt from "./clarificationPrompt";
import * as competitorAnalysisPrompt from "./competitorAnalysisPrompt";
import * as currentAlternativePrompt from "./currentAlternativePrompt";
import * as evaluationPrompt from "./evaluationPrompt";
import * as inputParserPrompt from "./inputParserPrompt";
import * as pageStructurePrompt from "./pageStructurePrompt";
import * as painIntensityPrompt from "./painIntensityPrompt";
import * as personaPrompt from "./personaPrompt";
import * as prdWriterPrompt from "./prdWriterPrompt";
import * as researchPlanPrompt from "./researchPlanPrompt";
import * as realProblemPrompt from "./realProblemPrompt";
import * as rewritePrompt from "./rewritePrompt";
import * as searchSummaryPrompt from "./searchSummaryPrompt";
import * as step3AnalysisPrompt from "./step3AnalysisPrompt";
import * as step4ClarificationPrompt from "./step4ClarificationPrompt";
import * as step7ResearchPlanPrompt from "./step7ResearchPlanPrompt";
import * as step8MarketAnalysisPrompt from "./step8MarketAnalysisPrompt";
import * as step9CompetitorIdentificationPrompt from "./step9CompetitorIdentificationPrompt";
import * as step10CompetitorAnalysisTablePrompt from "./step10CompetitorAnalysisTablePrompt";
import * as step11UserPersonaPrompt from "./step11UserPersonaPrompt";
import * as step12MvpPrdPrompt from "./step12MvpPrdPrompt";
import * as systemPrompt from "./systemPrompt";
import * as usageScenarioPrompt from "./usageScenarioPrompt";

export type PromptTemplate = {
  promptId: string;
  version: string;
  description: string;
  buildPrompt: (input: unknown) => string;
};

export const promptRegistry = {
  system: systemPrompt,
  understandProductIdea: inputParserPrompt,
  analyzeUsageScenario: usageScenarioPrompt,
  analyzeRealProblem: realProblemPrompt,
  analyzeCurrentAlternative: currentAlternativePrompt,
  analyzePainIntensity: painIntensityPrompt,
  analyzeStep3: step3AnalysisPrompt,
  generateStep4Clarification: step4ClarificationPrompt,
  generateStep7ResearchPlan: step7ResearchPlanPrompt,
  generateStep8MarketAnalysis: step8MarketAnalysisPrompt,
  generateStep9CompetitorIdentification: step9CompetitorIdentificationPrompt,
  generateStep10CompetitorAnalysisTable: step10CompetitorAnalysisTablePrompt,
  generateStep11UserPersonas: step11UserPersonaPrompt,
  generateStep12MvpPrd: step12MvpPrdPrompt,
  generateClarificationQuestions: clarificationPrompt,
  generateResearchPlan: researchPlanPrompt,
  runMarketResearch: searchSummaryPrompt,
  generateSearchSummary: searchSummaryPrompt,
  generateCompetitorAnalysis: competitorAnalysisPrompt,
  generateUserPersonas: personaPrompt,
  generateMvpPrd: prdWriterPrompt,
  generatePageStructure: pageStructurePrompt,
  evaluateProductIdea: evaluationPrompt,
  rewriteResult: rewritePrompt
} satisfies Record<string, PromptTemplate>;

export type PromptNodeName = keyof typeof promptRegistry;

export function getPromptByNodeName(nodeName: PromptNodeName): PromptTemplate {
  return promptRegistry[nodeName];
}

export {
  clarificationPrompt,
  competitorAnalysisPrompt,
  currentAlternativePrompt,
  evaluationPrompt,
  inputParserPrompt,
  pageStructurePrompt,
  painIntensityPrompt,
  personaPrompt,
  prdWriterPrompt,
  researchPlanPrompt,
  realProblemPrompt,
  rewritePrompt,
  searchSummaryPrompt,
  step3AnalysisPrompt,
  step4ClarificationPrompt,
  step7ResearchPlanPrompt,
  step8MarketAnalysisPrompt,
  step9CompetitorIdentificationPrompt,
  step10CompetitorAnalysisTablePrompt,
  step11UserPersonaPrompt,
  step12MvpPrdPrompt,
  systemPrompt,
  usageScenarioPrompt
};
