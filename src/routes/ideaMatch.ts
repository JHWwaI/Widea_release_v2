import { type Express, type Request, type Response } from "express";
import { type PrismaClient, type Prisma, type TargetMarket } from "@prisma/client";
import Groq from "groq-sdk";
import { requireAuth } from "../lib/auth.js";
import { consumeCredits, getCreditBalance } from "../lib/credits.js";
import {
  getAuthedUser,
  handleRouteError,
  respondCreditConflict,
  respondInsufficientCredits,
} from "../lib/http.js";
import {
  IDEA_MATCH_GENERATION_VERSION,
  normalizeGeneratedIdeas,
} from "../lib/ideaMatch.js";
import { searchSimilarCases } from "../lib/vectorDb.js";
import { geminiChat } from "../lib/geminiChat.js";
import { ensureWorkspaceForIdea } from "../lib/workspace.js";

const CREDIT_COSTS = { "idea-match": 10, "idea-unlock": 5, "deep-report": 8, "artifacts": 5 };

interface CustomerNeeds {
  industries: string[];
  problemKeywords: string;
  budgetRange: string;
  teamSize: string;
  revenueGoal: string;
  commitment: string;
  launchTimeline: string;
  technicalSkills: string[];
  domainExpertise: string[];
  existingAssets: string[];
  targetMarket: string;
  targetCustomerAge: string;
  revenueModelPref: string[];
  riskTolerance: string;
}

function buildSemanticQuery(needs: CustomerNeeds): string {
  const parts: string[] = [];

  if (needs.problemKeywords) {
    parts.push(`Problem to solve: ${needs.problemKeywords}`);
  }

  if (needs.industries.length > 0) {
    parts.push(`Industries: ${needs.industries.join(", ")}`);
  }

  parts.push(`Target market: ${needs.targetMarket}`);

  if (needs.revenueModelPref.length > 0) {
    parts.push(`Revenue model preference: ${needs.revenueModelPref.join(", ")}`);
  }

  if (needs.technicalSkills.length > 0) {
    parts.push(`Technical capabilities: ${needs.technicalSkills.join(", ")}`);
  }

  if (needs.domainExpertise.length > 0) {
    parts.push(`Domain expertise: ${needs.domainExpertise.join(", ")}`);
  }

  const budgetLabel: Record<string, string> = {
    ZERO: "zero budget (bootstrapped, no initial capital)",
    UNDER_5M: "micro budget under $4K",
    FIVE_TO_10M: "small budget $4K-$8K",
    TEN_TO_30M: "moderate budget $8K-$25K",
    THIRTY_TO_50M: "mid-sized budget $25K-$40K",
    FIFTY_TO_100M: "significant budget $40K-$80K",
    OVER_100M: "large budget over $80K",
  };
  if (needs.budgetRange && budgetLabel[needs.budgetRange]) {
    parts.push(`Budget scale: ${budgetLabel[needs.budgetRange]}`);
  }

  const teamLabel: Record<string, string> = {
    SOLO: "solo founder",
    TWO_TO_THREE: "small team of 2-3",
    FOUR_TO_TEN: "team of 4-10",
    OVER_TEN: "team of 10+",
  };
  if (needs.teamSize && teamLabel[needs.teamSize]) {
    parts.push(`Team: ${teamLabel[needs.teamSize]}`);
  }

  if (needs.existingAssets.length > 0) {
    parts.push(`Existing assets: ${needs.existingAssets.join(", ")}`);
  }

  if (needs.targetCustomerAge) {
    parts.push(`Target customer age: ${needs.targetCustomerAge}`);
  }

  return parts.join(". ") + ".";
}

function buildIdeaMatchPrompt(
  matchedCases: Array<{
    companyName: string;
    industry: string | null;
    revenueModel: string | null;
    targetMarket: string;
    targetCustomerProfile: string | null;
    problemStatement: string | null;
    signatureMoves: string | null;
    koreaStrategy: Record<string, unknown> | null;
    replicationGuide: Record<string, unknown> | null;
    marketTiming: Record<string, unknown> | null;
    score: number;
  }>,
  needs: CustomerNeeds
): string {
  const caseSummary = matchedCases
    .map((item, index) => {
      let summary = `## 벤치마크 ${index + 1}: ${item.companyName}`;
      summary += `\n- 산업: ${item.industry ?? "N/A"} | 수익모델: ${item.revenueModel ?? "N/A"} | 시장: ${item.targetMarket} | 유사도: ${item.score}`;

      if (item.targetCustomerProfile) {
        summary += `\n- 핵심 고객: ${item.targetCustomerProfile}`;
      }
      if (item.problemStatement) {
        summary += `\n- 해결한 문제: ${item.problemStatement.substring(0, 120)}${item.problemStatement.length > 120 ? "..." : ""}`;
      }
      if (item.signatureMoves) {
        summary += `\n- 핵심 성장 전략: ${item.signatureMoves.substring(0, 120)}${item.signatureMoves.length > 120 ? "..." : ""}`;
      }

      // 한국 전략 분석 — 이 데이터가 아이디어 품질을 결정함
      const ks = item.koreaStrategy;
      if (ks) {
        if (ks.marketSizeEstKRW) summary += `\n- 한국 시장 규모: ${ks.marketSizeEstKRW}`;
        if (Array.isArray(ks.localCompetitors) && ks.localCompetitors.length > 0) {
          summary += `\n- 국내 경쟁사: ${(ks.localCompetitors as string[]).slice(0, 3).join(", ")}`;
        }
        if (Array.isArray(ks.directAdaptable) && ks.directAdaptable.length > 0) {
          summary += `\n- 한국에서 그대로 쓸 수 있는 전략: ${(ks.directAdaptable as string[]).slice(0, 2).join(" / ")}`;
        }
        if (Array.isArray(ks.mustChange) && ks.mustChange.length > 0) {
          summary += `\n- 반드시 바꿔야 할 것: ${(ks.mustChange as string[]).slice(0, 2).join(" / ")}`;
        }
        if (ks.culturalInsights) summary += `\n- 한국 문화 인사이트: ${String(ks.culturalInsights).substring(0, 100)}`;
        if (ks.successScore) summary += `\n- 한국 성공 가능성 점수: ${ks.successScore}/100 (${ks.successScoreReason ?? ""})`;
        if (ks.bestLaunchCity) summary += `\n- 한국 최적 런칭 채널/도시: ${ks.bestLaunchCity}`;
      }

      // 복제 가이드 — 실현 가능성 판단 근거
      const rg = item.replicationGuide;
      if (rg) {
        if (rg.minCapitalKRW) summary += `\n- 최소 필요 자본: ${Number(rg.minCapitalKRW).toLocaleString("ko-KR")}원`;
        if (rg.monthsToMVP) summary += `\n- MVP까지 ${rg.monthsToMVP}개월 / 첫 매출까지 ${rg.monthsToRevenue ?? "?"}개월`;
        if (Array.isArray(rg.criticalSuccessFactors) && rg.criticalSuccessFactors.length > 0) {
          summary += `\n- 성공 필수 조건: ${(rg.criticalSuccessFactors as string[]).slice(0, 2).join(" / ")}`;
        }
        if (Array.isArray(rg.commonFailureModes) && rg.commonFailureModes.length > 0) {
          summary += `\n- 흔한 실패 패턴: ${(rg.commonFailureModes as string[]).slice(0, 2).join(" / ")}`;
        }
      }

      // 시장 타이밍 — 지금 한국에서 해야 하는 이유
      const mt = item.marketTiming;
      if (mt) {
        if (mt.koreaTimingNote) summary += `\n- 한국 지금 타이밍: ${String(mt.koreaTimingNote).substring(0, 120)}`;
        if (mt.opportunityWindow) summary += `\n- 기회 창: ${String(mt.opportunityWindow).substring(0, 80)}`;
      }

      return summary;
    })
    .join("\n\n");

  const allowedCompanyNames = matchedCases.map((c) => c.companyName).join(", ");

  return `You are a world-class startup strategy consultant specializing in Korean market entry.

Your task: Based on the REAL benchmark data below (actual analysis of global companies), propose 3 CREATIVE and CONCRETE startup ideas for the Korean market.

🚨 ANTI-HALLUCINATION RULES (위반 시 응답 무효):
A. sourceBenchmarks의 companyName은 반드시 다음 중 하나여야 함: [${allowedCompanyNames}]
   - 이 목록에 없는 회사명을 절대 만들거나 추측하지 말 것
   - 만약 적합한 벤치마크가 없으면 sourceBenchmarks에 빈 배열 [] 반환
B. 모든 수치(매출, ARR, 사용자수, 펀딩액, 시장규모)는 위 벤치마크 데이터에 명시된 것만 사용
   - 벤치마크에 없는 수치를 만들지 말 것 (예: "ARR $10M" 같은 임의 숫자 금지)
   - 수치를 인용할 땐 출처 회사명을 함께 표기 (예: "Klarna 2023년 ARR $400M 기준")
   - 데이터에 없는 수치 자리에는 정성적 표현 사용 (예: "충분한 시장 규모", "초기 단계")
C. 정부지원사업, 한국 회사명, 한국 통계 수치는 다음 규칙 준수:
   - 확실하게 검증 가능한 정보만 인용 (예: "K-Startup", "TIPS 프로그램", "중소벤처기업부")
   - 없는 정부지원사업명/공고번호를 만들지 말 것
   - 한국 경쟁사명은 위 벤치마크의 "국내 경쟁사" 필드에 명시된 것만 사용
D. 외주/플랫폼명은 실제 존재하는 곳만 (크몽, 위시켓, 숨고, 탈잉) — 가짜 플랫폼명 생성 금지
E. 불확실한 정보는 "추정" 또는 "검토 필요" 라벨을 붙여 명확히 표시

CRITICAL RULES:
1. ALL text values MUST be in Korean (한국어). NEVER empty "".
2. Return ONLY valid JSON. No markdown, no code fences.
3. Each idea MUST be grounded in the benchmark data below:
   - Use the "한국에서 그대로 쓸 수 있는 전략" as the foundation
   - Address the "반드시 바꿔야 할 것" as your differentiation
   - Reference the "흔한 실패 패턴"을 피하는 구체적 방법을 summaryKo에 포함
   - Use "한국 지금 타이밍"을 whyNowInKoreaKo의 근거로 활용
4. Be EXTREMELY SPECIFIC — 컨설턴트 언어 절대 금지:
   🚫 금지 어휘 (정부 백서·SI 제안서 톤):
       "○○합리화", "○○최적화", "○○혁신", "○○디지털화", "○○고도화",
       "○○자동화 솔루션", "스마트 ○○", "AI 기반 ○○ 플랫폼", "원스톱",
       "패러다임 전환", "초연결", "통합관리", "효율 극대화", "비용 절감",
       "엔터프라이즈급", "차세대", "혁신적인"
       → 위 단어가 들어가면 응답 무효. 대신 ↓
   ✅ 강제 형식: 구체적 동사 + 수치 + 도구·플랫폼명
       BAD : "배송합리화 솔루션", "공간최적화 플랫폼"
       GOOD: "배달기사가 다음 픽업을 받기까지 평균 4분 더 빠르게 매칭"
       GOOD: "오피스 회의실 점유율을 카메라로 측정해 비어있는 시간 30% 자동 재배정"
   - titleKo: 2~5글자 브랜드명. **컨셉은 "해외 SaaS의 한국 적응판" 톤** — 글로벌 비즈니스 분위기는 살아 있되 한국 사용자에게 자연스러운 이름.
     ✅ 지향하는 톤 (한국 실존 SaaS·DTC, 너무 유명한 토스·당근 X, 적당히 모르는 정도 O):
       (a) 영어 한 단어 + 살짝 변형 — "잔디"(Slack 한국형 협업툴), "플로우"(Asana 한국형), "알로"(Pipedrive 톤)
       (b) 영문 + 짧은 한국어 — "채널톡"(Intercom 한국형), "마켓컬리", "스푼라디오", "뱅크샐러드"
       (c) 단순 영문 발음 한글 — "컬리"(Faire 톤), "발란", "트렌비", "센드버드", "리멤버"
       (d) 한 글자 한자어/한국어 + 의외성 — "결"(decision tool), "터"(workspace), "잇다"(connector), "모먼트"
       (e) 영어+숫자 — "클래스101", "Form42", "Layer8" 식 (단 너무 흔하지 않게)
     🚫 **절대 금지 패턴** (위반 시 응답 무효):
       - 영어 형용사+명사 클리셰: 에코-, 그린-, 스마트-, 클린-, 프리미엄-, 디지털-, AI-
       - -잇/-봇/-톡/-허브/-플로우/-마켓/-스토어/-플랫폼/-매니저/-시스템 접미사 (단순 합성)
       - 산업명+행위명 합성: 콘텐츠마켓, 헬스케어매니저, 푸드딜리버리
       - 너무 유명한 한국 스타트업 클리셰: 당근/토스/야놀자/배민/쿠팡/직방 같은 토속 슬랭 (이미 뇌에 박혀 있어서 베끼기 쉬움)
     ✅ 좋은 이름의 조건: ① 글로벌 SaaS 톤 ② 발음 2~3음절 ③ 검색해도 다른 회사 안 나올 정도로 고유 ④ 한국 사용자가 영어 발음으로 자연스럽게 읽힘
     세 개 idea의 titleKo는 서로 다른 패턴(a~e 중 다른 글자)을 사용해야 함.
   - oneLinerKo: "누가 + 무엇을 + 어떻게" 공식 (예: "소상공인이 재고를 POS 연동 AI로 자동 발주하는 SaaS")
   - summaryKo: 5~6문장. 3개 아이디어가 **서로 다른 글의 시작과 리듬**을 가져야 함. 같은 템플릿으로 3번 쓰면 응답 무효.
       🚫 금지 첫 문장 패턴 (절대 시작 못함):
         "현재 한국의 ○○ 시장은", "최근 ○○이 성장하고", "한국에서는 ○○ 수요가",
         "○○ 산업은 ○○로 변화", "한국의 ○○ 크리에이터는", "○○ 시장에서는"
       ✅ **3개 아이디어는 다음 5가지 시작 스타일 중 서로 다른 것을 골라 사용** (같은 스타일 반복 X):
         (A) 사용자 한 명의 구체적 페인 장면: "용산 전자상가에서 18년째 PC를 고치는 김씨는 매주 화요일 ○○로 ○○분을 쓴다."
         (B) 충격 통계·반전 사실: "한국 직장인 73%가 ○○를 ○○로 처리하지만, 그중 ○○%는 ○○를 모른다."
         (C) 단일 메커니즘 선언: "[제품명]은 [구체 기능]을 [구체 트리거]에 자동 발동시켜 [기존 방식]을 [수치] 단축한다."
         (D) 벤치마크 직접 인용: "Stripe가 7줄 코드로 결제를 만들었다면, [제품명]은 [한국 컨텍스트]를 [수치] 줄인다."
         (E) 반대 명제(역설): "○○는 [통념]이다. 하지만 우리는 [반대 가설]에 베팅한다 — 이유는 [근거]."
       각 idea의 글 흐름도 달라야 함:
         - 한 idea = 페인 → 메커니즘 → 차별화 (서사형)
         - 한 idea = 단언 → 근거(벤치마크 수치 인용) → 한국 변형 (분석형)
         - 한 idea = 통계·반전 → 기회 발견 → 실행 경로 (저널리즘형)
       모든 문장에 동사·수치·도구명·기간 중 최소 하나는 포함. 컨설턴트 톤(○○화·○○화) 단어 사용 시 응답 무효.
   - whyNowInKoreaKo: 위 벤치마크의 "한국 지금 타이밍" 데이터를 직접 인용하며 구체적 수치 포함 (출처 회사명 명시)
   - first10CustomersKo: 벤치마크의 초기 고객 전략을 한국화 (예: "배달의민족 입점 음식점 중 리뷰 100건 이상 매장에 직접 영업")
5. marketFitScore: 0-100 정수. confidenceScore: 0-100 정수.
   - confidenceScore 계산 기준: 벤치마크 데이터 풍부도(40%) + 한국 시장 데이터 명확도(30%) + 실행 가능성(30%)
   - 데이터가 부족하면 50점 이하로 냉정하게 평가 (과대평가 금지)
6. sourceBenchmarks: 어떤 벤치마크의 어떤 전략을 어떻게 변형했는지 구체적으로. companyName은 위 허용 목록에서만.
7. 3개 아이디어는 서로 완전히 다른 접근 방식 (고객/모델/채널 중 최소 2개는 달라야 함).
8. estimatedCost.notesKo에 "이 견적은 크몽/위시켓 평균 시세 기반 추정치이며 실제 견적과 다를 수 있음" 같은 출처/한계 명시.
9. risks 항목 중 최소 1개는 "데이터 한계로 검증 필요한 가정" 형태의 epistemic risk 포함.

=== 실제 글로벌 벤치마크 데이터 (이 데이터를 반드시 근거로 사용할 것) ===

${caseSummary}

=== 여기까지 벤치마크 데이터 ===

Founder profile:
- Industries: ${needs.industries.length > 0 ? needs.industries.join(", ") : "Any"}
- Problem to solve: ${needs.problemKeywords || "Not specified"}
- Budget range: ${needs.budgetRange}
- Team size: ${needs.teamSize}
- Revenue goal: ${needs.revenueGoal || "Not specified"}
- Commitment: ${needs.commitment}
- Launch timeline: ${needs.launchTimeline}
- Technical skills: ${
    needs.technicalSkills.length > 0
      ? needs.technicalSkills.join(", ")
      : "None"
  }
- Domain expertise: ${
    needs.domainExpertise.length > 0 ? needs.domainExpertise.join(", ") : "None"
  }
- Existing assets: ${
    needs.existingAssets.length > 0 ? needs.existingAssets.join(", ") : "None"
  }
- Target market: ${needs.targetMarket}
- Target customer age: ${needs.targetCustomerAge || "Not specified"}
- Preferred revenue models: ${
    needs.revenueModelPref.length > 0
      ? needs.revenueModelPref.join(", ")
      : "No preference"
  }
- Risk tolerance: ${needs.riskTolerance}

Return JSON only in this format:
{
  "ideas": [
    {
      "titleKo": "string",
      "oneLinerKo": "string",
      "summaryKo": "string",
      "whyNowInKoreaKo": "string",
      "sourceBenchmarks": [
        {
          "companyName": "string",
          "whyReferencedKo": "string"
        }
      ],
      "targetCustomer": {
        "personaKo": "string",
        "painKo": "string",
        "buyingTriggerKo": "string"
      },
      "problemDetail": {
        "currentWorkflowKo": "string",
        "failureCostKo": "string"
      },
      "businessModel": {
        "modelKo": "string",
        "pricingKo": "string",
        "expansionKo": "string"
      },
      "mvpScope": {
        "coreFeatures": ["string"],
        "excludeForNow": ["string"]
      },
      "goToMarket": {
        "primaryChannelKo": "string",
        "secondaryChannelsKo": ["string"],
        "first10CustomersKo": "string"
      },
      "executionPlan": [
        {
          "phase": "30days|60days|90days",
          "goalKo": "string",
          "actionsKo": ["string"],
          "kpiKo": "string"
        }
      ],
      "estimatedCost": {
        "buildKo": "string",
        "opsKo": "string",
        "notesKo": "string"
      },
      "risks": [
        {
          "riskKo": "string",
          "impact": "HIGH|MEDIUM|LOW",
          "mitigationKo": "string"
        }
      ],
      "marketFitScore": 0,
      "confidenceScore": 0
    }
  ]
}`;
}

export function registerIdeaMatchRoutes(
  app: Express,
  { prisma }: { prisma: PrismaClient; groq?: Groq }
): void {
  app.post(
    "/api/idea-match",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaMatchCost = CREDIT_COSTS["idea-match"];

        const {
          projectTitle,
          industries = [],
          problemKeywords = "",
          budgetRange = "TEN_TO_30M",
          teamSize = "SOLO",
          revenueGoal = "",
          commitment = "FULL_TIME",
          launchTimeline = "SIX_MONTHS",
          technicalSkills = [],
          domainExpertise = [],
          existingAssets = [],
          targetMarket = "B2C",
          targetCustomerAge = "",
          revenueModelPref = [],
          riskTolerance = "BALANCED",
          topK = 5,
          projectPolicyId,
        } = req.body;

        // Input validation
        if (!problemKeywords && industries.length === 0) {
          res.status(400).json({
            error:
              "industries(관련분야) 혹은 problemKeywords(구체적인 문제) 중하나는 반드시입력되어야 합니다.",
          });
          return;
        }

        console.log(
          `\n💡 Idea Match 요청: industries=${JSON.stringify(industries)}, problem="${problemKeywords}"`
        );

        // Load or create project
        const validMarkets: TargetMarket[] = ["B2B", "B2C", "B2B2C"];
        const market = validMarkets.includes(targetMarket) ? targetMarket : "B2C";

        const budgetMap: Record<string, number> = {
          ZERO: 0,
          UNDER_5M: 5_000_000,
          FIVE_TO_10M: 10_000_000,
          TEN_TO_30M: 30_000_000,
          THIRTY_TO_50M: 50_000_000,
          FIFTY_TO_100M: 100_000_000,
          OVER_100M: 200_000_000,
        };

        let project: Awaited<
          ReturnType<typeof prisma.projectPolicy.findUnique>
        > = null;
        let pendingProjectData: Prisma.ProjectPolicyUncheckedCreateInput | null =
          null;
        if (projectPolicyId) {
          project = await prisma.projectPolicy.findUnique({
            where: { id: projectPolicyId },
          });
          if (!project || project.userId !== userId) {
            res.status(404).json({ error: "프로젝트를 찾을 수 없습니다." });
            return;
          }
        } else {
          // 기본 제목 — 산업 1순위 + "사업 아이디어" (날짜 사용 금지)
          const firstIndustry = Array.isArray(industries) && industries.length > 0
            ? String(industries[0]).trim()
            : "";
          const defaultTitle = firstIndustry
            ? `${firstIndustry} 사업 아이디어`
            : "새 사업 아이디어";
          pendingProjectData = {
            title: projectTitle || defaultTitle,
            targetMarket: market,
            budgetLimit: BigInt(budgetMap[budgetRange] ?? 30_000_000),
            targetDuration: launchTimeline,
            coreCompetencies: technicalSkills,
            industries,
            problemKeywords: problemKeywords || null,
            budgetRange: (budgetRange && budgetRange !== "ZERO") ? budgetRange : null,
            teamSize: teamSize || null,
            revenueGoal: revenueGoal || null,
            commitment: commitment || null,
            launchTimeline: launchTimeline || null,
            technicalSkills,
            domainExpertise,
            existingAssets,
            targetCustomerAge: targetCustomerAge || null,
            revenueModelPref,
            riskTolerance: riskTolerance || null,
            userId,
          };
        }

        const currentBalance = await getCreditBalance(prisma, userId);
        if (currentBalance === null || currentBalance < ideaMatchCost) {
          respondInsufficientCredits(res, {
            feature: "Idea Match",
            required: ideaMatchCost,
            creditBalance: currentBalance,
          });
          return;
        }

        // Build semantic query and search
        const searchQuery = buildSemanticQuery({
          industries,
          problemKeywords,
          budgetRange,
          teamSize,
          revenueGoal,
          commitment,
          launchTimeline,
          technicalSkills,
          domainExpertise,
          existingAssets,
          targetMarket: market,
          targetCustomerAge,
          revenueModelPref,
          riskTolerance,
        });

        console.log(
          `   [1/4] 검색쿼리 생성됨: "${searchQuery.substring(0, 80)}..."`
        );

        console.log(`   [2/4] Pinecone 벡터 검색중..`);
        const vectorResultsRaw = await searchSimilarCases(
          searchQuery,
          // 옛 시드 필터 후 최소 topK 확보 위해 더 많이 가져옴
          Math.min(topK, 10) * 2,
          market !== "B2C" && market !== "B2B" && market !== "B2B2C"
            ? undefined
            : market
        );

        // 데이터 품질 필터: rawSeedData 풍부한 100개 시드(bench-*)만 사용
        // 옛 10개는 rawSeedData가 null이라 deep-report가 빈 화면이 됨
        const vectorResults = vectorResultsRaw
          .filter((r) => r.metadata.dbId?.startsWith("bench-"))
          .slice(0, Math.min(topK, 10));
        const filteredOut = vectorResultsRaw.length - vectorResults.length;
        if (filteredOut > 0) {
          console.log(
            `   [2/4] 데이터 부실한 ${filteredOut}건 필터됨 (rawSeedData 없음)`
          );
        }

        // Join with PostgreSQL metadata
        const matchedCases = await Promise.all(
          vectorResults.map(async (r) => {
            const meta = await prisma.globalCaseMeta.findUnique({
              where: { vectorDbId: r.metadata.dbId },
              include: { deepAnalysis: true },
            });
            return {
              globalCaseMetaId: meta?.id ?? null,
              companyName: r.metadata.companyName,
              industry: meta?.industry ?? null,
              foundedYear: meta?.foundedYear ?? null,
              fundingStage: meta?.fundingStage ?? null,
              revenueModel: meta?.revenueModel ?? r.metadata.businessModel ?? null,
              targetMarket: r.metadata.targetMarket,
              targetCustomerProfile: meta?.targetCustomerProfile ?? null,
              problemStatement: meta?.deepAnalysis?.problemStatement ?? null,
              signatureMoves: meta?.deepAnalysis?.signatureMoves ?? null,
              koreaStrategy: (meta?.deepAnalysis?.koreaStrategy ?? null) as Record<string, unknown> | null,
              replicationGuide: (meta?.deepAnalysis?.replicationGuide ?? null) as Record<string, unknown> | null,
              marketTiming: (meta?.deepAnalysis?.marketTiming ?? null) as Record<string, unknown> | null,
              score: Math.round(r.score * 10000) / 10000,
            };
          })
        );

        console.log(`   [2/4] 벡터 검색완료: ${matchedCases.length}건 매칭`);
        matchedCases.forEach((c, i) =>
          console.log(
            `         ${i + 1}. ${c.companyName} (유사도: ${c.score}, 업종: ${
              c.industry ?? "-"
            })`
          )
        );

        if (matchedCases.length === 0) {
          const persisted = await prisma.$transaction(async (tx) => {
            const creditResult = await consumeCredits(
              tx,
              userId,
              ideaMatchCost,
              "idea-match"
            );
            if (!creditResult) return null;

            let resolvedProjectId = project?.id ?? "";
            if (!resolvedProjectId && pendingProjectData) {
              const createdProject = await tx.projectPolicy.create({
                data: pendingProjectData,
              });
              resolvedProjectId = createdProject.id;
            }

            return {
              projectPolicyId: resolvedProjectId,
              balanceAfter: creditResult.balanceAfter,
            };
          });

          if (!persisted) {
            respondCreditConflict(res, {
              feature: "Idea Match",
              required: ideaMatchCost,
            });
            return;
          }

          res.status(200).json({
            projectPolicyId: persisted.projectPolicyId,
            searchQuery,
            matchedCases: [],
            localizedIdeas: { ideas: [] },
            generatedIdeas: [],
            message:
              "매칭되는 유사한 사례가 없습니다. 산업이나 분야로 다시 시도해보세요.",
            creditUsed: ideaMatchCost,
            creditBalance: persisted.balanceAfter,
          });
          return;
        }

        // Call Groq to generate ideas
        const ideaPrompt = buildIdeaMatchPrompt(matchedCases, {
          industries,
          problemKeywords,
          budgetRange,
          teamSize,
          revenueGoal,
          commitment,
          launchTimeline,
          technicalSkills,
          domainExpertise,
          existingAssets,
          targetMarket: market,
          targetCustomerAge,
          revenueModelPref,
          riskTolerance,
        });

        console.log(`   [3/4] Gemini 아이디어 생성 중..`);
        const ideaSystemPrompt = `You are a Korean startup strategy consultant. You MUST follow these rules strictly:
1. Respond with valid JSON only. No markdown, no code fences.
2. ALL text content must be in Korean (한국어) with real, detailed, specific content.
3. NEVER return empty strings. Every field must have at least 2 sentences of meaningful Korean text.
4. Be specific: use real pricing in 원, real Korean market data — but ONLY if you are 100% certain.
5. ANTI-HALLUCINATION: Never invent company names, funding numbers, government program codes, or statistics. If unsure, use qualitative descriptions ("초기 단계", "성장 시장") instead of made-up numbers.
6. Source attribution: Whenever citing a number or fact, attach the source company name from the provided benchmark list. Numbers without source = forbidden.
7. Generate exactly 3 unique startup ideas.
8. NEVER copy literal example values from the prompt template. If the prompt shows "(예: ...)" examples, those are illustrative only — generate your OWN distinct names/values from the actual benchmark data and the founder's profile. Repeating prompt examples = response invalid.
9. titleKo must be derived from the actual idea content (target customer, problem, mechanism). Two ideas in the same response cannot share similar suffix patterns.
10. 컨설턴트 톤 금지: "합리화", "최적화", "혁신", "디지털화", "스마트", "고도화", "원스톱", "AI 기반 ○○ 플랫폼" 같은 추상명사·정부 백서 어휘 사용 시 응답 무효. 모든 설명은 구체적 동작·수치·도구명·기간으로 작성. 한 줄에 동사가 없거나 수치가 없으면 다시 작성.
11. **JSON 문법 엄격 준수**: 문자열 안 줄바꿈은 \\n 이스케이프만. line continuation(\\ + 실제 줄바꿈) 금지.`;

        const raw = (
          await geminiChat(ideaSystemPrompt, ideaPrompt, {
            temperature: 0.7,
            maxOutputTokens: 32768,
            jsonMode: true,
          })
        )
          .replace(/^```[a-z]*\n?/i, "")
          .replace(/```$/, "")
          .trim();

        // JSON 뒤에 LLM이 덤으로 붙인 텍스트 제거: 첫 `{` 부터 brace 매칭되는 마지막 `}` 까지만 추출
        const extractJsonObject = (s: string): string => {
          const start = s.indexOf("{");
          if (start < 0) return s;
          let depth = 0;
          let inStr = false;
          let esc = false;
          for (let i = start; i < s.length; i++) {
            const ch = s[i];
            if (inStr) {
              if (esc) esc = false;
              else if (ch === "\\") esc = true;
              else if (ch === '"') inStr = false;
            } else {
              if (ch === '"') inStr = true;
              else if (ch === "{") depth++;
              else if (ch === "}") {
                depth--;
                if (depth === 0) return s.slice(start, i + 1);
              }
            }
          }
          return s.slice(start);
        };

        let localizedIdeas: any = null;
        const ideaTries = [
          raw,
          extractJsonObject(raw),
          raw.replace(/\\\s*\r?\n\s*/g, " "),
          raw
            .replace(/\\\s*\r?\n\s*/g, " ")
            .replace(/\r?\n(?=\s*[a-zA-Z가-힣])/g, "\\n"),
          extractJsonObject(raw.replace(/\\\s*\r?\n\s*/g, " ")),
        ];
        let ideaParseErr: unknown = null;
        for (const cand of ideaTries) {
          try {
            localizedIdeas = JSON.parse(cand);
            break;
          } catch (e) {
            ideaParseErr = e;
          }
        }
        if (!localizedIdeas) {
          console.error(
            `   [3/4] ❌ JSON 파싱 실패 (${ideaTries.length}회). Raw 앞부분:\n${raw.substring(0, 400)}\n에러: ${(ideaParseErr as Error)?.message ?? ideaParseErr}`
          );
          res.status(502).json({
            errorCode: "LLM_PARSE_ERROR",
            error: "AI 응답이 중간에 끊겼습니다. 다시 시도해주세요.",
          });
          return;
        }

        // Anti-hallucination post-filter: 화이트리스트 외 회사명 제거
        const allowedSet = new Set(matchedCases.map((c) => c.companyName));
        let droppedHallucinated = 0;
        if (Array.isArray(localizedIdeas?.ideas)) {
          for (const idea of localizedIdeas.ideas) {
            if (Array.isArray(idea?.sourceBenchmarks)) {
              const before = idea.sourceBenchmarks.length;
              idea.sourceBenchmarks = idea.sourceBenchmarks.filter((b: any) => {
                const name = b?.companyName || b?.name;
                return typeof name === "string" && allowedSet.has(name);
              });
              droppedHallucinated += before - idea.sourceBenchmarks.length;
            }
          }
        }
        if (droppedHallucinated > 0) {
          console.warn(
            `   [3/4] ⚠️ 환각 sourceBenchmarks ${droppedHallucinated}건 제거됨 (allowed: ${allowedSet.size}개)`
          );
        }

        // 게으름 감지: 3개 idea의 summaryKo 첫 30자가 겹치면 경고
        if (Array.isArray(localizedIdeas?.ideas) && localizedIdeas.ideas.length > 1) {
          const heads = localizedIdeas.ideas
            .map((i: any) => (typeof i?.summaryKo === "string" ? i.summaryKo.slice(0, 30) : ""))
            .filter((s: string) => s.length > 0);
          const dupes = heads.filter((h: string, i: number) => heads.indexOf(h) !== i);
          if (dupes.length > 0) {
            console.warn(
              `   [3/4] ⚠️ summaryKo 첫 문장 중복 감지: "${dupes[0]}..." (LLM 게으름 — 프롬프트 룰 위반)`
            );
          }
          // 컨설턴트 톤 어휘 감지
          const banned = /합리화|최적화|혁신|디지털화|고도화|원스톱|패러다임|초연결|차세대|엔터프라이즈급/g;
          let bannedHits = 0;
          for (const idea of localizedIdeas.ideas) {
            const text = JSON.stringify(idea);
            const matches = text.match(banned);
            if (matches) bannedHits += matches.length;
          }
          if (bannedHits > 0) {
            console.warn(
              `   [3/4] ⚠️ 금지 어휘(컨설턴트 톤) ${bannedHits}회 등장 — 프롬프트 룰 위반`
            );
          }
        }

        console.log(
          `   [3/4] Idea generation completed: ${(localizedIdeas as any).ideas?.length ?? 0} ideas`
        );
        const normalizedGeneratedIdeas = normalizeGeneratedIdeas(
          localizedIdeas
        );

        // Save to DB with transaction
        console.log(`   [4/4] DB 저장중..`);
        const persisted = await prisma.$transaction(async (tx) => {
          const creditResult = await consumeCredits(
            tx,
            userId,
            ideaMatchCost,
            "idea-match"
          );
          if (!creditResult) return null;

          let resolvedProjectId = project?.id ?? "";
          if (!resolvedProjectId && pendingProjectData) {
            const createdProject = await tx.projectPolicy.create({
              data: pendingProjectData,
            });
            resolvedProjectId = createdProject.id;
          }

          const session = await tx.ideaMatchSession.create({
            data: {
              searchQuery,
              matchedCases: JSON.parse(JSON.stringify(matchedCases)),
              localizedIdeas,
              locale: "ko-KR",
              generationVersion: IDEA_MATCH_GENERATION_VERSION,
              projectPolicyId: resolvedProjectId,
            },
          });

          // Calculate similarity scores and determine free vs paid ideas
          const ideasWithSimilarityScores = normalizedGeneratedIdeas.map(
            (idea) => {
              let avgSimilarity = 0;

              if (
                idea.sourceBenchmarks &&
                Array.isArray(idea.sourceBenchmarks) &&
                idea.sourceBenchmarks.length > 0
              ) {
                const scores: number[] = [];
                for (const bench of idea.sourceBenchmarks) {
                  const benchObj = bench as any;
                  const companyName = benchObj?.companyName || benchObj?.name;
                  if (companyName) {
                    const matched = matchedCases.find(
                      (c) => c.companyName === companyName
                    );
                    if (matched && matched.score > 0) {
                      scores.push(matched.score);
                    }
                  }
                }
                if (scores.length > 0) {
                  avgSimilarity =
                    scores.reduce((a, b) => a + b, 0) / scores.length;
                }
              }

              return {
                idea,
                avgSimilarity: Math.round(avgSimilarity * 10000) / 10000,
                ideaIndex: idea.rank - 1,
              };
            }
          );

          // Top 3 free, bottom 2 paid
          ideasWithSimilarityScores.sort(
            (a, b) => b.avgSimilarity - a.avgSimilarity
          );
          const freeIdeaIndices = new Set(
            ideasWithSimilarityScores.slice(0, 3).map((x) => x.ideaIndex)
          );

          const generatedIdeas = [];
          for (const item of ideasWithSimilarityScores) {
            const idea = item.idea;
            const requiresCredit = !freeIdeaIndices.has(item.ideaIndex);

            const createdIdea = await tx.generatedIdea.create({
              data: {
                sessionId: session.id,
                ...idea,
                similarityScore: item.avgSimilarity,
                requiresCredit,
              },
            });

            generatedIdeas.push(createdIdea);
          }

          return {
            sessionId: session.id,
            projectPolicyId: resolvedProjectId,
            balanceAfter: creditResult.balanceAfter,
            generatedIdeas,
          };
        });

        if (!persisted) {
          respondCreditConflict(res, {
            feature: "Idea Match",
            required: ideaMatchCost,
          });
          return;
        }

        console.log(`   [4/4] 완료됨 (sessionId: ${persisted.sessionId})`);

        // Blur paid ideas
        const unlockCost = CREDIT_COSTS["idea-unlock"];
        const blurredIdeas = persisted.generatedIdeas.map((idea) => {
          if (idea.requiresCredit) {
            return {
              id: idea.id,
              sessionId: idea.sessionId,
              rank: idea.rank,
              status: idea.status,
              titleKo: idea.titleKo,
              oneLinerKo: idea.oneLinerKo,
              similarityScore: idea.similarityScore,
              requiresCredit: idea.requiresCredit,
              unlockCost,
              createdAt: idea.createdAt,
              updatedAt: idea.updatedAt,
            };
          }
          return idea;
        });

        res.json({
          sessionId: persisted.sessionId,
          projectPolicyId: persisted.projectPolicyId,
          matchedCasesCount: matchedCases.length,
          localizedIdeas,
          generatedIdeas: blurredIdeas,
          creditUsed: ideaMatchCost,
          creditBalance: persisted.balanceAfter,
        });
      } catch (err: any) {
        // Groq API specific error handling
        if (err?.status === 429 || err?.error?.type === "rate_limit_exceeded") {
          res.status(429).json({
            errorCode: "LLM_RATE_LIMIT",
            error: "AI 요청 한도를 초과했습니다. 1~2분 후 다시 시도해주세요.",
          });
          return;
        }
        if (err?.status === 503 || err?.status === 502) {
          res.status(503).json({
            errorCode: "LLM_UNAVAILABLE",
            error: "AI 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.",
          });
          return;
        }
        handleRouteError(res, err, "Idea Match 오류");
      }
    }
  );

  // Unlock paid idea
  app.patch(
    "/api/ideas/:ideaId/unlock",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaId = Array.isArray(req.params.ideaId)
          ? req.params.ideaId[0]
          : req.params.ideaId;
        const unlockCost = CREDIT_COSTS["idea-unlock"];

        // Load idea
        const idea = await prisma.generatedIdea.findUnique({
          where: { id: ideaId },
        });

        if (!idea) {
          res.status(404).json({ error: "아이디어를 찾을 수 없습니다." });
          return;
        }

        // Load session to get projectPolicyId
        const session = await prisma.ideaMatchSession.findUnique({
          where: { id: idea.sessionId },
          select: { projectPolicyId: true },
        });

        if (!session) {
          res.status(404).json({ error: "세션을 찾을 수 없습니다." });
          return;
        }

        // Ownership check
        const project = await prisma.projectPolicy.findUnique({
          where: { id: session.projectPolicyId },
          select: { userId: true },
        });

        if (!project || project.userId !== userId) {
          res
            .status(403)
            .json({
              error: "이 아이디어에 접근할 권한이 없습니다.",
            });
          return;
        }

        if (!idea.requiresCredit) {
          res.status(400).json({ error: "이미 공개된 아이디어입니다." });
          return;
        }

        const currentBalance = await getCreditBalance(prisma, userId);
        if (currentBalance === null || currentBalance < unlockCost) {
          respondInsufficientCredits(res, {
            feature: "Idea Unlock",
            required: unlockCost,
            creditBalance: currentBalance,
          });
          return;
        }

        // Transactional unlock
        const result = await prisma.$transaction(async (tx) => {
          const creditResult = await consumeCredits(
            tx,
            userId,
            unlockCost,
            "idea-unlock"
          );
          if (!creditResult) return null;

          const unlockedIdea = await tx.generatedIdea.update({
            where: { id: ideaId },
            data: { requiresCredit: false },
          });

          return {
            idea: unlockedIdea,
            balanceAfter: creditResult.balanceAfter,
          };
        });

        if (!result) {
          respondCreditConflict(res, {
            feature: "Idea Unlock",
            required: unlockCost,
          });
          return;
        }

        res.json({
          message: "아이디어가 공개되었습니다.",
          idea: result.idea,
          creditUsed: unlockCost,
          creditBalance: result.balanceAfter,
        });
      } catch (err) {
        handleRouteError(res, err, "Idea Unlock 오류");
      }
    }
  );

  // ─────────────────────────────────────────────────────────
  // POST /api/ideas/:ideaId/deep-report
  // 5단계 심층 리포트: 실존 증명 → MVP 흑역사 → 송곳 전략 → 피벗 경고 → 기술 엔진
  // ─────────────────────────────────────────────────────────
  app.post(
    "/api/ideas/:ideaId/deep-report",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        // preview는 무료 — 인증만 확인
        getAuthedUser(req);
        const ideaId = Array.isArray(req.params.ideaId)
          ? req.params.ideaId[0]
          : req.params.ideaId;

        const idea = await prisma.generatedIdea.findUnique({
          where: { id: ideaId },
        });
        if (!idea) {
          res.status(404).json({ error: "아이디어를 찾을 수 없습니다." });
          return;
        }
        if (idea.requiresCredit) {
          res.status(403).json({
            error: "잠긴 아이디어입니다. 먼저 잠금 해제 후 이용해주세요.",
          });
          return;
        }

        // 매칭된 벤치마크 회사들 (sourceBenchmarks의 companyName + score) 가져오기
        const sourceBenchmarks = Array.isArray(idea.sourceBenchmarks)
          ? (idea.sourceBenchmarks as Array<{ companyName?: string; score?: number }>)
          : [];
        const companyNames = sourceBenchmarks
          .map((b) => b?.companyName)
          .filter((n): n is string => typeof n === "string");
        // companyName → score 맵
        const scoreByCompany = new Map<string, number>();
        for (const b of sourceBenchmarks) {
          if (typeof b?.companyName === "string" && typeof b?.score === "number") {
            scoreByCompany.set(b.companyName, b.score);
          }
        }

        if (companyNames.length === 0) {
          res.status(400).json({
            error: "이 아이디어에 연결된 벤치마크가 없어 심층 리포트를 만들 수 없습니다.",
          });
          return;
        }

        const benchmarks = await prisma.globalCaseMeta.findMany({
          where: { companyName: { in: companyNames } },
          include: { deepAnalysis: true },
        });

        if (benchmarks.length === 0) {
          res.status(400).json({
            error: "벤치마크 데이터를 찾을 수 없습니다.",
          });
          return;
        }

        // 벤치마크 컨텍스트 구성
        // Raw benchmark data — 프론트로 직접 전달 (LLM paraphrase 우회)
        const benchmarkData = benchmarks.map((b) => {
          const raw = (b.deepAnalysis?.rawSeedData ?? {}) as Record<string, unknown>;
          const score = scoreByCompany.get(b.companyName) ?? null;
          return {
            companyName: b.companyName,
            industry: b.industry,
            foundedYear: b.foundedYear,
            matchScore: score, // 0~1 (Pinecone 유사도)
            valuationUsd:
              typeof raw.valuation_usd === "number" && raw.valuation_usd > 0
                ? raw.valuation_usd
                : null,
            totalFundingUsd:
              typeof raw.total_funding_usd === "number" && raw.total_funding_usd > 0
                ? raw.total_funding_usd
                : null,
            archiveLink:
              typeof raw.archive_link === "string" && raw.archive_link.startsWith("http")
                ? raw.archive_link
                : null,
            mvpFeatures: Array.isArray(raw.mvp_features)
              ? (raw.mvp_features as string[]).filter((s) => typeof s === "string")
              : [],
            techStackHint: Array.isArray(raw.tech_stack_hint)
              ? (raw.tech_stack_hint as string[]).filter((s) => typeof s === "string")
              : [],
            initialChannel: typeof raw.initial_channel === "string" ? raw.initial_channel : null,
            initialMethod: typeof raw.initial_method === "string" ? raw.initial_method : null,
            pivotMoment: typeof raw.pivot_moment === "string" ? raw.pivot_moment : null,
            beachheadMarket:
              typeof raw.beachhead_market === "string" ? raw.beachhead_market : null,
          };
        });

        // 매칭 점수 높은 순 정렬 (primary = 가장 유사한 회사)
        benchmarkData.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

        // 전체 유사도 (idea.similarityScore가 있으면 그것 사용, 없으면 평균 계산)
        const overallSimilarity =
          typeof idea.similarityScore === "number" && idea.similarityScore > 0
            ? idea.similarityScore
            : (() => {
                const scores = benchmarkData
                  .map((b) => b.matchScore)
                  .filter((s): s is number => typeof s === "number");
                return scores.length > 0
                  ? scores.reduce((a, b) => a + b, 0) / scores.length
                  : 0;
              })();

        // 캐시 체크 - 동일 idea의 deep report가 있으면 재사용 (benchmarkData는 항상 fresh)
        if (idea.deepReportKo && typeof idea.deepReportKo === "object") {
          res.json({
            report: idea.deepReportKo,
            benchmarkData,
            overallSimilarity,
            unlocked: idea.deepReportUnlocked,
            cached: true,
          });
          return;
        }

        // LLM 컨텍스트용 텍스트 (heroLine·한국 적용 작성에만 사용)
        const benchmarkContext = benchmarkData
          .map((b) => {
            const valuation = b.valuationUsd
              ? `$${(b.valuationUsd / 1e9).toFixed(1)}B`
              : "비공개";
            const funding = b.totalFundingUsd
              ? `$${(b.totalFundingUsd / 1e6).toFixed(0)}M`
              : "비공개";
            return `### ${b.companyName} (${b.foundedYear ?? "?"}년, ${b.industry})
- 가치: ${valuation} | 펀딩: ${funding}
- archive_link: ${b.archiveLink ?? "?"}
- MVP 기능 3개: ${b.mvpFeatures.join(" / ") || "?"}
- 초기 채널: ${b.initialChannel ?? "?"}
- 첫 100명 방법: ${b.initialMethod ?? "?"}
- 송곳 시장: ${b.beachheadMarket ?? "?"}
- 피벗 순간: ${b.pivotMoment ?? "?"}
- 기술 스택: ${b.techStackHint.join(", ") || "?"}`;
          })
          .join("\n\n");

        const userIdeaSummary = `# 사용자 아이디어
- **제목**: ${idea.titleKo}
- **한 줄 요약**: ${idea.oneLinerKo ?? ""}
- **상세**: ${idea.summaryKo ?? ""}`;

        const systemPrompt = `# Role
너는 스타트업 고고학자이자 비즈니스 전략 분석가다. 사용자가 입력한 아이디어와 DB에서 매칭된 [Benchmark_Data]를 연결하여, 아이디어의 실현 가능성을 입증하는 심층 리포트를 작성한다.

# Tone & Style
차분하고 분석적이지만 창업자의 실행력을 자극하는 확신에 찬 어조. "분석 결과", "박제된 기록에 따르면" 같은 데이터 기반 표현 사용.

# 절대 규칙
- 모든 수치·날짜·회사명은 [Benchmark_Data]에 명시된 것만 사용. 없는 정보 만들지 말 것.
- 응답은 JSON으로만. 마크다운·코드펜스 없음.
- 컨설턴트 톤(합리화·최적화·혁신·디지털화·고도화·원스톱·차세대) 단어 사용 시 응답 무효.
- **JSON 문법 엄격 준수**: 문자열 안에서 줄바꿈은 반드시 \\n 이스케이프 사용. 절대 line continuation(\\ + 실제 줄바꿈) 사용 금지. 모든 문자열 값은 한 줄로 작성.`;

        const userPrompt = `${userIdeaSummary}

# Benchmark_Data (DB에서 매칭된 ${benchmarks.length}개 글로벌 케이스)
${benchmarkContext}

# 너의 역할
**[Benchmark_Data]는 이미 사용자에게 그대로 보여진다.** 따라서 너는 사실을 paraphrase하지 말 것. 너는 오직 두 가지만 만든다:

1. **heroLine** (각 섹션 거대 타이포): 데이터를 직접 인용한 30자 이내의 충격적 한 줄. 데이터의 사실을 그대로 쓰되 임팩트 있게.
2. **한국 적용** (3·4번 섹션만): 해외 데이터를 한국 채널·맥락으로 변형한 구체 액션.

# heroLine 작성 가이드 (각 섹션)

## 1. 실존 증명 (existenceProof.heroLine)
- 형식: 가치 + 한 줄 사실. 30자 이내.
- 좋은 예: "$70B. Hacker News에서 시작했다.", "Stripe — 7줄 코드, 14년, $70B"
- 나쁜 예: "이 모델은 글로벌 시장에서 검증된 비즈니스 모델입니다." (paraphrase, 추상)

## 2. MVP 흑역사 (mvpReality.heroLine)
- 형식: 그들이 가졌던 가장 초라한 것 한 줄.
- 좋은 예: "매트리스 사진 3장. 끝.", "iDEAL 결제만 됐다. 나머지는 없었다."
- 나쁜 예: "초기에 단순한 기능으로 시작했습니다." (paraphrase)

## 3. 송곳 전략 (wedgeStrategy.heroLine)
- 형식: 그들의 첫 100명 채널을 한 줄로 강렬하게.
- 좋은 예: "DNC 컨퍼런스장. 매트리스 한 장.", "유튜브 무료 위젯 + Reddit 한 글."
- 나쁜 예: "초기 사용자는 컨퍼런스를 통해 확보했습니다."

## 4. 피벗 경고 (pivotWarning.heroLine)
- 형식: 잃을 뻔했던 것/배운 것 한 줄.
- 좋은 예: "Discord는 게임 만들다 죽을 뻔했다.", "Stripe도 처음엔 마켓플레이스였다."
- 나쁜 예: "초기에 어려움을 겪었습니다."

## 5. 기술 엔진 (technicalEngine.heroLine)
- 형식: 핵심 무기를 한 줄. 기술스택을 직접 언급 OK.
- 좋은 예: "Postgres + Stripe. 두 개면 이긴다.", "Ruby on Rails 1인. 그게 출발선."
- 나쁜 예: "백엔드 개발 능력이 필요합니다."

# 한국 적용 작성 가이드 (3·4번만)

## 3번 koreanAdaptationKo (송곳 전략의 한국화)
- 해외 채널을 한국 채널로 변형. 구체적 플랫폼명 사용 (당근·네이버카페·디스코드·인프런·크몽·배민 등).
- 2~3문장, "어디서 어떻게"가 명확.

## 4번 shortcutKo (피벗 경고의 한국 정답)
- "그들이 X에서 실패한 학습을, 한국 창업자는 처음부터 Y로 시작" 톤.
- 2~3문장.

# 추가: hookLine
사용자 아이디어를 ${benchmarks[0].companyName}와 연결하는 단 한 줄. 30자 이내.
- 좋은 예: "Stripe가 갔던 길, 한국에서 다시 그릴 수 있다."
- 나쁜 예: "이 비즈니스 모델은 검증되었습니다."

# 출력 JSON 형식 (필드 누락 금지)
{
  "hookLine": "string (30자 이내, 사용자가 흥분할 한 줄)",
  "existenceProof": { "heroLine": "string" },
  "mvpReality": { "heroLine": "string" },
  "wedgeStrategy": {
    "heroLine": "string",
    "koreanAdaptationKo": "string"
  },
  "pivotWarning": {
    "heroLine": "string",
    "shortcutKo": "string"
  },
  "technicalEngine": { "heroLine": "string" }
}`;

        // 무료 preview 생성 (잠금 해제는 별도 엔드포인트)
        console.log(`[deep-report] ${idea.titleKo} (벤치마크 ${benchmarks.length}개) preview 생성 시작...`);

        const deepRawText = await geminiChat(systemPrompt, userPrompt, {
          temperature: 0.5,
          maxOutputTokens: 8192,
          jsonMode: true,
        });

        const rawDeepOriginal = deepRawText
          .replace(/^```[a-z]*\n?/i, "")
          .replace(/```$/, "")
          .trim();

        let report: Record<string, unknown> | null = null;
        const deepTries = [
          rawDeepOriginal,
          rawDeepOriginal.replace(/\\\s*\r?\n\s*/g, " "),
          rawDeepOriginal
            .replace(/\\\s*\r?\n\s*/g, " ")
            .replace(/\r?\n(?=\s*[a-zA-Z가-힣])/g, "\\n"),
        ];
        let deepLastErr: unknown = null;
        for (const cand of deepTries) {
          try {
            report = JSON.parse(cand);
            break;
          } catch (e) {
            deepLastErr = e;
          }
        }
        if (!report) {
          console.error(
            `[deep-report] JSON 파싱 실패 (${deepTries.length}회). Raw 앞부분:\n${rawDeepOriginal.substring(0, 400)}\n에러: ${(deepLastErr as Error)?.message ?? deepLastErr}`
          );
          res.status(502).json({
            errorCode: "LLM_PARSE_ERROR",
            error: "심층 리포트 생성에 실패했습니다. 다시 시도해주세요.",
          });
          return;
        }

        // 무료 캐싱 (잠금 해제는 별도 엔드포인트에서 unlocked=true로 변경)
        await prisma.generatedIdea.update({
          where: { id: ideaId },
          data: { deepReportKo: report as Prisma.InputJsonValue },
        });

        console.log(`[deep-report] ${idea.titleKo} preview 완료`);

        res.json({
          report,
          benchmarkData,
          overallSimilarity,
          unlocked: idea.deepReportUnlocked,
          cached: false,
        });
      } catch (err) {
        handleRouteError(res, err, "Deep Report 오류");
      }
    }
  );

  // ─────────────────────────────────────────────────────────
  // POST /api/ideas/:ideaId/deep-report/unlock
  // 8 크레딧 차감 후 deepReportUnlocked = true (블러 해제)
  // ─────────────────────────────────────────────────────────
  app.post(
    "/api/ideas/:ideaId/deep-report/unlock",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaId = Array.isArray(req.params.ideaId)
          ? req.params.ideaId[0]
          : req.params.ideaId;
        const cost = CREDIT_COSTS["deep-report"];

        const idea = await prisma.generatedIdea.findUnique({
          where: { id: ideaId },
        });
        if (!idea) {
          res.status(404).json({ error: "아이디어를 찾을 수 없습니다." });
          return;
        }
        if (idea.deepReportUnlocked) {
          res.json({ ok: true, alreadyUnlocked: true, creditUsed: 0, creditBalance: null });
          return;
        }

        const balance = await getCreditBalance(prisma, userId);
        const isAdmin = balance === null;
        if (!isAdmin && (balance ?? 0) < cost) {
          respondInsufficientCredits(res, {
            feature: "Deep Report Unlock",
            required: cost,
            creditBalance: balance,
          });
          return;
        }

        const result = await prisma.$transaction(async (tx) => {
          if (!isAdmin) {
            const cr = await consumeCredits(tx, userId, cost, "deep-report");
            if (!cr) return null;
            await tx.generatedIdea.update({
              where: { id: ideaId },
              data: { deepReportUnlocked: true },
            });
            return { balanceAfter: cr.balanceAfter };
          } else {
            await tx.generatedIdea.update({
              where: { id: ideaId },
              data: { deepReportUnlocked: true },
            });
            return { balanceAfter: null };
          }
        });

        if (!result) {
          respondCreditConflict(res, { feature: "Deep Report Unlock", required: cost });
          return;
        }

        res.json({
          ok: true,
          alreadyUnlocked: false,
          creditUsed: isAdmin ? 0 : cost,
          creditBalance: result.balanceAfter,
        });
      } catch (err) {
        handleRouteError(res, err, "Deep Report Unlock 오류");
      }
    }
  );

  // ─────────────────────────────────────────────────────────
  // POST /api/ideas/:ideaId/artifacts
  // 실행 도구 3종 — 팀원 모집 공고 + 커피챗 템플릿 + 투자 체크리스트
  // 전제: deep-report 먼저 생성되어 있어야 함 (벤치마크 데이터 활용)
  // ─────────────────────────────────────────────────────────
  app.post(
    "/api/ideas/:ideaId/artifacts",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaId = Array.isArray(req.params.ideaId)
          ? req.params.ideaId[0]
          : req.params.ideaId;
        const cost = CREDIT_COSTS["artifacts"];

        const idea = await prisma.generatedIdea.findUnique({ where: { id: ideaId } });
        if (!idea) {
          res.status(404).json({ error: "아이디어를 찾을 수 없습니다." });
          return;
        }
        if (idea.requiresCredit) {
          res.status(403).json({ error: "잠긴 아이디어입니다. 먼저 잠금 해제해주세요." });
          return;
        }

        // 캐시 체크
        if (idea.artifactsKo && typeof idea.artifactsKo === "object") {
          res.json({
            artifacts: idea.artifactsKo,
            cached: true,
            creditUsed: 0,
          });
          return;
        }

        // 번들링: deep-report 있으면 artifacts 무료
        // deep-report 잠금 해제(8크레딧 결제)했을 때만 artifacts 무료 번들
        const bundledFree = idea.deepReportUnlocked === true;

        // 벤치마크 회사 데이터 가져오기
        const sourceBenchmarks = Array.isArray(idea.sourceBenchmarks)
          ? (idea.sourceBenchmarks as Array<{ companyName?: string }>)
          : [];
        const companyNames = sourceBenchmarks
          .map((b) => b?.companyName)
          .filter((n): n is string => typeof n === "string");

        if (companyNames.length === 0) {
          res.status(400).json({
            error: "이 아이디어에 연결된 벤치마크가 없어 실행 도구를 만들 수 없습니다.",
          });
          return;
        }

        const benchmarks = await prisma.globalCaseMeta.findMany({
          where: { companyName: { in: companyNames } },
          include: { deepAnalysis: true },
        });

        // 벤치마크 컨텍스트 (deep-report와 유사)
        const primary = benchmarks[0];
        const primaryRaw = (primary?.deepAnalysis?.rawSeedData ?? {}) as Record<string, unknown>;

        const benchmarkContext = benchmarks
          .map((b) => {
            const raw = (b.deepAnalysis?.rawSeedData ?? {}) as Record<string, unknown>;
            const valuation = typeof raw.valuation_usd === "number" && raw.valuation_usd > 0
              ? `$${(raw.valuation_usd / 1e9).toFixed(1)}B`
              : "비공개";
            const funding = typeof raw.total_funding_usd === "number" && raw.total_funding_usd > 0
              ? `$${(raw.total_funding_usd / 1e6).toFixed(0)}M`
              : "비공개";
            const mvp = Array.isArray(raw.mvp_features) ? raw.mvp_features.join(", ") : "데이터 없음";
            const tech = Array.isArray(raw.tech_stack_hint) ? raw.tech_stack_hint.join(", ") : "데이터 없음";
            return `### ${b.companyName} (${b.industry})
- 가치: ${valuation} | 펀딩: ${funding}
- MVP 핵심 기능: ${mvp}
- 초기 채널/방법: ${raw.initial_channel ?? "?"} / ${raw.initial_method ?? "?"}
- 피벗 순간: ${raw.pivot_moment ?? "데이터 없음"}
- 기술 스택: ${tech}
- archive_link: ${raw.archive_link ?? "?"}`;
          })
          .join("\n\n");

        const userIdeaSummary = `# 사용자 아이디어
- 제목: ${idea.titleKo}
- 한 줄 요약: ${idea.oneLinerKo ?? ""}
- 상세: ${(idea.summaryKo ?? "").slice(0, 400)}`;

        const systemPrompt = `# Role
너는 스타트업 헤드헌터이자 IR 전략가다. 심층 리포트의 분석을 바탕으로 창업자가 즉시 복사·사용할 수 있는 '실행 도구 3종'을 제작한다.

# 절대 규칙
- 모든 수치·회사명은 [Benchmark_Data]에 명시된 것만 사용. 없는 정보 만들지 말 것.
- JSON으로만 응답. 마크다운 코드펜스 없음.
- 컨설턴트 톤(합리화·최적화·혁신·디지털화·고도화·원스톱·차세대) 금지.
- 한국어 작성, 사용자가 그대로 복사해 붙여넣을 수 있을 만큼 완성된 텍스트.
- **JSON 문법 엄격 준수**: 문자열 안에서 줄바꿈은 반드시 \\n 이스케이프 사용. 절대 line continuation(\\ + 실제 줄바꿈) 사용 금지. 모든 문자열 값은 한 줄로 작성하되 길어도 됨.`;

        const primaryValuation = typeof primaryRaw.valuation_usd === "number" && primaryRaw.valuation_usd > 0
          ? `$${(primaryRaw.valuation_usd / 1e9).toFixed(1)}B`
          : "비공개";
        const primaryFunding = typeof primaryRaw.total_funding_usd === "number" && primaryRaw.total_funding_usd > 0
          ? `$${(primaryRaw.total_funding_usd / 1e6).toFixed(0)}M`
          : "비공개";

        const userPrompt = `${userIdeaSummary}

# Benchmark_Data
${benchmarkContext}

# 생성할 3종 도구

## 1) 팀원 모집 공고 (recruitingPost)
- titleKo는 "${primary.companyName} 모델의 한국형 파트너 모집" 같은 톤. 너무 진부하지 않게.
- bodyKo는 마크다운. 다음 요소 포함:
  * 시작: "해외에서 ${primaryValuation} 가치 / ${primaryFunding} 펀딩으로 검증된 ${primary.industry} 모델의 한국형 파트너를 찾습니다"
  * 중간: 우리 아이디어의 한 줄 요약 + ${primary.companyName}에서 차용한 구체 전술 인용
  * MVP 범위: "거대한 꿈은 있지만 시작은 [구체 기능 3개]에 집중"
  * 어떤 사람을 찾는지: 역할·경험·특성 (3~5줄)
  * 우리가 제공: 지분/보상/문화 (실현 가능 범위에서)
  * 마무리 CTA: 지원 방법
- 700~900자.

## 2) 커피챗 템플릿 (coffeeChatTemplate)
- subjectKo: 호기심 유발하는 제목 (40자 이내). "스팸" 느낌 X.
- targetRole: 영입 대상 직군 (예: "풀스택 엔지니어", "ML 리서처")
- bodyKo: LinkedIn DM/이메일 톤. 다음 요소:
  * 발신자가 어떻게 상대방을 알게 됐는지 (간단한 진정성)
  * "${primary.companyName}이 ${primaryValuation}까지 간 모델인데, 한국형으로 만들고 있어요"
  * "이 모델의 초기 성공 방정식을 ${primary.companyName}의 초창기 사이트(별도 첨부 링크)를 통해 분해 분석했습니다" 톤으로 자연스럽게 언급. **URL을 본문에 직접 쓰지 말 것** — UI가 별도 링크 카드로 보여줍니다.
  * "단순 외주가 아니라 검증된 모델의 코어 멤버" 톤
  * 30분 커피챗 제안 + 일정 1~2개
- 400~500자, 진성 1:1 메시지 톤.
- ⛔ bodyKo 안에 절대 http/https URL이나 archive_link(...) 같은 placeholder 표기 금지. 모든 URL은 백엔드가 별도 필드로 자동 첨부.

## 3) 투자 체크리스트 (investorChecklist)
- kpiToProve: 가장 먼저 증명해야 할 KPI 3개 배열
  * 각 항목: { metric, target, rationale }
  * 예: { metric: "월 활성 고객 (MAU)", target: "출시 3개월 내 500명", rationale: "${primary.companyName}이 PMF 신호로 본 임계 트래픽" }
- unitEconomics: { cacKo, ltvKo, logicKo }
  * cacKo: "추정 CAC ₩○○ — 근거: ${primary.companyName}의 [initial_channel]을 한국 [채널]로 변형, 클릭당 평균 ₩○○"
  * ltvKo: "추정 LTV ₩○○ — 근거: 해외 평균 리텐션 ○○개월 × 객단가 ₩○○"
  * logicKo: CAC < LTV/3 같은 단위경제 논리
- moatKo: "왜 이 사업이 망하지 않는가" 2~3문장. ${primary.companyName}의 pivot_moment를 인용해 "그들이 X에서 실패하고 Y로 정답을 찾았다 → 우리는 처음부터 Y로 시작" 톤.

# 출력 JSON
{
  "recruitingPost": {
    "titleKo": "string",
    "bodyKo": "string (마크다운)",
    "evidenceCompanyName": "${primary.companyName}"
  },
  "coffeeChatTemplate": {
    "subjectKo": "string (40자 이내)",
    "targetRole": "string",
    "bodyKo": "string",
    "evidenceCompanyName": "${primary.companyName}"
  },
  "investorChecklist": {
    "kpiToProve": [
      { "metric": "string", "target": "string", "rationale": "string" }
    ],
    "unitEconomics": {
      "cacKo": "string",
      "ltvKo": "string",
      "logicKo": "string"
    },
    "moatKo": "string",
    "evidenceCompanyName": "${primary.companyName}"
  }
}`;

        const balance = await getCreditBalance(prisma, userId);
        const isAdmin = balance === null;
        const effectiveCost = bundledFree ? 0 : cost;
        if (!isAdmin && !bundledFree && (balance ?? 0) < cost) {
          respondInsufficientCredits(res, {
            feature: "Artifacts",
            required: cost,
            creditBalance: balance,
          });
          return;
        }

        console.log(
          `[artifacts] ${idea.titleKo} 생성 시작${bundledFree ? " (deep-report 번들 — 무료)" : ""}...`
        );

        const rawText = await geminiChat(systemPrompt, userPrompt, {
          temperature: 0.6,
          maxOutputTokens: 8192,
          jsonMode: true,
        });

        const rawOriginal = rawText
          .replace(/^```[a-z]*\n?/i, "")
          .replace(/```$/, "")
          .trim();

        // Llama가 자주 토하는 패턴 자동 수리:
        //  1) JSON 문자열 안의 `\` + 줄바꿈 (line continuation) 제거
        //  2) 문자열 안 isolated newline → \n 이스케이프
        function repairLLMJson(s: string): string {
          // backslash + (whitespace) + newline → space
          let out = s.replace(/\\\s*\r?\n\s*/g, " ");
          // 문자열 안 escape 안 된 raw newline → 문자열 안인지 판단해 \n 으로
          // (간단히: 모든 raw newline을 \\n으로 바꾸지만, 코드 구조 줄바꿈은 제외하기 어려움)
          // -> 대신 LLM이 \n을 escape 안 한 케이스만 좁게 잡기
          // 최소 fix만 하고, 그래도 실패하면 두 번째 시도에서 더 적극적으로
          return out;
        }

        let artifacts: Record<string, unknown> | null = null;
        const tries: string[] = [
          rawOriginal,
          repairLLMJson(rawOriginal),
          rawOriginal.replace(/\\\s*\r?\n\s*/g, " ").replace(/\r?\n(?=\s*[a-zA-Z가-힣])/g, "\\n"),
        ];
        let lastErr: unknown = null;
        for (const candidate of tries) {
          try {
            artifacts = JSON.parse(candidate);
            break;
          } catch (e) {
            lastErr = e;
          }
        }
        if (!artifacts) {
          console.error(
            `[artifacts] JSON 파싱 실패 (${tries.length}회 시도). Raw 앞부분:\n${rawOriginal.substring(0, 400)}\n에러: ${(lastErr as Error)?.message ?? lastErr}`
          );
          res.status(502).json({
            errorCode: "LLM_PARSE_ERROR",
            error: "도구 생성에 실패했습니다. 다시 시도해주세요.",
          });
          return;
        }

        // URL 본문 텍스트 정제 + 별도 필드로 첨부
        function stripUrls(text: string | undefined): string | undefined {
          if (typeof text !== "string") return text;
          return text
            .replace(/archive_link\s*\([^)]*\)/gi, `${primary.companyName} 초창기 사이트`)
            .replace(/\[archive_link\]/gi, `${primary.companyName} 초창기 사이트`)
            .replace(/https?:\/\/\S+/gi, "")
            .replace(/\s+\.\s*/g, ". ")
            .replace(/\s{2,}/g, " ")
            .trim();
        }

        if (artifacts.coffeeChatTemplate && typeof artifacts.coffeeChatTemplate === "object") {
          const cct = artifacts.coffeeChatTemplate as Record<string, unknown>;
          if (typeof cct.bodyKo === "string") cct.bodyKo = stripUrls(cct.bodyKo);
          if (typeof cct.subjectKo === "string") cct.subjectKo = stripUrls(cct.subjectKo);
          if (typeof primaryRaw.archive_link === "string" && primaryRaw.archive_link.startsWith("http")) {
            cct.archiveLink = primaryRaw.archive_link;
            cct.archiveLabel = `${primary.companyName} Wayback Machine 초창기 스냅샷`;
          }
        }
        if (artifacts.recruitingPost && typeof artifacts.recruitingPost === "object") {
          const rp = artifacts.recruitingPost as Record<string, unknown>;
          if (typeof rp.bodyKo === "string") rp.bodyKo = stripUrls(rp.bodyKo);
          if (typeof rp.titleKo === "string") rp.titleKo = stripUrls(rp.titleKo);
        }

        const persisted = await prisma.$transaction(async (tx) => {
          if (!isAdmin && effectiveCost > 0) {
            const creditResult = await consumeCredits(tx, userId, effectiveCost, "artifacts");
            if (!creditResult) return null;
            await tx.generatedIdea.update({
              where: { id: ideaId },
              data: { artifactsKo: artifacts as Prisma.InputJsonValue },
            });
            return { balanceAfter: creditResult.balanceAfter };
          } else {
            await tx.generatedIdea.update({
              where: { id: ideaId },
              data: { artifactsKo: artifacts as Prisma.InputJsonValue },
            });
            return { balanceAfter: null };
          }
        });

        if (!persisted) {
          respondCreditConflict(res, { feature: "Artifacts", required: cost });
          return;
        }

        console.log(`[artifacts] ${idea.titleKo} 완료`);

        res.json({
          artifacts,
          cached: false,
          creditUsed: isAdmin ? 0 : effectiveCost,
          creditBalance: persisted.balanceAfter,
        });
      } catch (err) {
        handleRouteError(res, err, "Artifacts 오류");
      }
    }
  );

  // ─────────────────────────────────────────────────────────
  // POST /api/ideas/:ideaId/launch-workspace
  // 자동 마법: artifacts 기반으로 커뮤니티 글 2개(모집·외주) 생성 + projectId 반환
  // 무료. artifacts가 있어야 호출 가능.
  // ─────────────────────────────────────────────────────────
  app.post(
    "/api/ideas/:ideaId/launch-workspace",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = getAuthedUser(req);
        const ideaId = Array.isArray(req.params.ideaId)
          ? req.params.ideaId[0]
          : req.params.ideaId;

        const idea = await prisma.generatedIdea.findUnique({
          where: { id: ideaId },
          include: { session: true },
        });
        if (!idea) {
          res.status(404).json({ error: "아이디어를 찾을 수 없습니다." });
          return;
        }

        // artifacts가 있으면 풍부한 글, 없으면 idea 자체로 기본 글 작성
        const artifacts = (idea.artifactsKo ?? null) as
          | {
              recruitingPost?: { titleKo?: string; bodyKo?: string };
              coffeeChatTemplate?: { subjectKo?: string; bodyKo?: string; targetRole?: string };
              investorChecklist?: unknown;
            }
          | null;

        const projectId = idea.session.projectPolicyId;

        // 트랜잭션: 두 개의 커뮤니티 글 동시 생성 (artifacts 없으면 idea 기본값 사용)
        const result = await prisma.$transaction(async (tx) => {
          const recruitTitle =
            artifacts?.recruitingPost?.titleKo?.trim() || `[팀원 모집] ${idea.titleKo}`;
          const fallbackRecruit = `${idea.titleKo} — 함께 만들 팀원을 찾습니다.\n\n${idea.oneLinerKo ?? ""}\n\n${idea.summaryKo ?? ""}\n\n관심 있는 분은 댓글 또는 DM 남겨주세요.`;
          const recruitContent =
            artifacts?.recruitingPost?.bodyKo?.trim() || fallbackRecruit;

          const recruitingPost = await tx.communityPost.create({
            data: {
              title: recruitTitle.slice(0, 200),
              content: recruitContent,
              category: "TEAM_RECRUIT",
              authorId: userId,
            },
          });

          const coffeeChat = artifacts?.coffeeChatTemplate;
          const outsourceTitle = `[외주 의뢰] ${idea.titleKo} — ${coffeeChat?.targetRole ?? "전문가"} 모십니다`;
          const fallbackOutsource = `${idea.titleKo} 프로젝트의 외주 파트너를 찾습니다.\n\n${idea.oneLinerKo ?? ""}\n\n관심 있는 분은 댓글 또는 DM 남겨주세요. 자세한 견적은 별도 협의 가능합니다.`;
          const outsourceContent = coffeeChat?.bodyKo
            ? [
                coffeeChat.bodyKo,
                "",
                "---",
                `**아이디어 요약**: ${idea.oneLinerKo ?? ""}`,
                `**대상 역할**: ${coffeeChat?.targetRole ?? "전문가"}`,
              ]
                .filter(Boolean)
                .join("\n")
            : fallbackOutsource;

          const outsourcePost = outsourceContent
            ? await tx.communityPost.create({
                data: {
                  title: outsourceTitle.slice(0, 200),
                  content: outsourceContent,
                  category: "OUTSOURCE_REQUEST",
                  authorId: userId,
                },
              })
            : null;

          // 6단계 워크스페이스 셸도 같이 보장 (idempotent)
          await ensureWorkspaceForIdea(tx, ideaId);

          return { recruitingPost, outsourcePost };
        });

        console.log(
          `[launch-workspace] ${idea.titleKo} → recruit=${result.recruitingPost?.id ?? "-"} outsource=${result.outsourcePost?.id ?? "-"} project=${projectId} + workspace ensured`
        );

        res.json({
          projectId,
          recruitingPostId: result.recruitingPost?.id ?? null,
          outsourcePostId: result.outsourcePost?.id ?? null,
        });
      } catch (err) {
        handleRouteError(res, err, "Launch Workspace 오류");
      }
    }
  );
}
