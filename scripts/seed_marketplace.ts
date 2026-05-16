/**
 * 데모용 시드: 전문가 프로필 + 커뮤니티 글 채우기.
 * 실행: npm run seed:marketplace
 *
 * 동작:
 *   1) 가짜 사용자 12명 생성 (없으면)
 *   2) 각 사용자에 ExpertProfile 생성
 *   3) 카테고리별 커뮤니티 글 9개 생성
 */

import "dotenv/config";
import { PrismaClient, ExpertCategory, PostCategory, Prisma } from "@prisma/client";
import { hashPassword } from "../src/lib/auth.js";

const prisma = new PrismaClient();

type Career = { company: string; role: string; period: string; summary: string };
type Portfolio = { title: string; role: string; stack: string[]; summary: string; url: string };
type Edu = { school: string; degree: string; period: string };
type Cert = { name: string; issuer: string; year: string };

type ExpertSeed = {
  email: string;
  name: string;
  category: ExpertCategory;
  headline: string;
  bio: string;
  skills: string[];
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  links: Array<{ label: string; url: string }>;
  location: string;
  yearsOfExperience?: number;
  workMode?: "REMOTE" | "HYBRID" | "ONSITE";
  industries?: string[];
  careers?: Career[];
  portfolioItems?: Portfolio[];
  education?: Edu[];
  certifications?: Cert[];
};

const EXPERTS: ExpertSeed[] = [
  {
    email: "kim.dev@example.com",
    name: "김민준",
    category: "DEVELOPER",
    headline: "React·Next.js 풀스택 6년차, 핀테크/B2B SaaS 경험",
    bio: "토스·뱅크샐러드 등 핀테크에서 5년, 이후 SaaS 스타트업 CTO로 1년. 0→1 MVP 빌딩과 결제·인증 통합에 강합니다. TypeScript 강한 타이핑·테스트 커버리지 우선.",
    skills: ["React", "Next.js", "TypeScript", "PostgreSQL", "Prisma", "Toss Payments"],
    hourlyRateMin: 80000,
    hourlyRateMax: 130000,
    yearsOfExperience: 6,
    workMode: "REMOTE",
    industries: ["핀테크", "B2B SaaS"],
    links: [
      { label: "GitHub", url: "https://github.com/example-kim" },
      { label: "포트폴리오", url: "https://kim.dev" },
    ],
    location: "서울 (원격 가능)",
    careers: [
      {
        company: "InvoiceFlow (Series A, B2B SaaS)",
        role: "CTO",
        period: "2024.03 ~ 현재",
        summary: "B2B 인보이스 자동화 SaaS 0→1 빌딩. React/Next.js + Node 백엔드 전체 설계. 시드 라운드 12억 유치 기여.",
      },
      {
        company: "토스 (Toss)",
        role: "Senior Frontend Engineer",
        period: "2021.01 ~ 2024.02",
        summary: "토스 송금·증권 화면 풀스택 개발. 결제 흐름 리팩토링으로 전환율 8% 개선. 디자인 시스템 컨트리뷰터.",
      },
      {
        company: "뱅크샐러드",
        role: "Frontend Engineer",
        period: "2019.06 ~ 2020.12",
        summary: "가계부 자동 분류 UI 개편. 모바일 웹 PWA 성능 최적화 (LCP 4.2s → 1.8s).",
      },
    ],
    portfolioItems: [
      {
        title: "InvoiceFlow MVP",
        role: "CTO·풀스택",
        stack: ["Next.js", "tRPC", "PostgreSQL", "Prisma"],
        summary: "0→1 MVP 빌딩. 4개월 만에 베타 30사 확보. ARR 추정 1.5억.",
        url: "https://invoiceflow.example.com",
      },
      {
        title: "토스 송금 v3 리디자인",
        role: "Frontend Lead",
        stack: ["React", "Recoil", "Storybook"],
        summary: "송금 흐름 3단계 → 2단계. 전환율 14% → 22%. 평균 송금 시간 92초 → 38초.",
        url: "",
      },
    ],
    education: [
      { school: "서울대학교", degree: "컴퓨터공학 학사", period: "2013.03 ~ 2019.02" },
    ],
    certifications: [
      { name: "AWS Certified Solutions Architect (Associate)", issuer: "AWS", year: "2022" },
    ],
  },
  {
    email: "park.designer@example.com",
    name: "박지영",
    category: "DESIGNER",
    headline: "B2C 모바일 UX 디자이너, Figma·Framer 능숙",
    bio: "당근·오늘의집 인턴 후 프리랜서 4년차. 한국 사용자 정서에 맞춘 다크·미니멀 톤이 강점. 와이어프레임 → 프로토타입 → 디자인 시스템까지 한 번에.",
    skills: ["Figma", "Framer", "Webflow", "디자인 시스템", "UX 리서치"],
    hourlyRateMin: 60000,
    hourlyRateMax: 90000,
    yearsOfExperience: 4,
    workMode: "HYBRID",
    industries: ["B2C 커머스", "라이프스타일"],
    links: [
      { label: "Behance", url: "https://www.behance.net/example-park" },
      { label: "Dribbble", url: "https://dribbble.com/example-park" },
    ],
    location: "서울",
    careers: [
      {
        company: "프리랜서",
        role: "UX Designer",
        period: "2022.03 ~ 현재",
        summary: "B2C 모바일 앱 12건 디자인. 스타트업 시드~시리즈A 대상. 와이어프레임 → 프로토타입 → 핸드오프까지 한 사이클 진행.",
      },
      {
        company: "오늘의집 (Bucketplace)",
        role: "Product Designer (인턴)",
        period: "2021.09 ~ 2022.02",
        summary: "홈피드 카드 UI 개편 프로젝트 참여. 사용자 인터뷰 8건 정리.",
      },
      {
        company: "당근마켓",
        role: "Design 인턴",
        period: "2020.07 ~ 2020.12",
        summary: "중고거래 채팅 UI 개편 워크숍 참여. 디자인 시스템 컨트리뷰션.",
      },
    ],
    portfolioItems: [
      {
        title: "라이프스타일 앱 \"베란다\" 풀 리디자인",
        role: "Solo Designer",
        stack: ["Figma", "Framer", "디자인 시스템"],
        summary: "다크 모드 + 미니멀 카드 레이아웃. 출시 6개월 만에 앱스토어 라이프스타일 부문 12위.",
        url: "",
      },
      {
        title: "당근마켓 채팅 v2 (사이드 프로젝트)",
        role: "UX Researcher · Designer",
        stack: ["Figma", "사용자 인터뷰"],
        summary: "스팸 메시지 차단 UI 개선 제안. 인턴 발표회 우수상.",
        url: "",
      },
    ],
    education: [
      { school: "홍익대학교", degree: "시각디자인 학사", period: "2017.03 ~ 2022.02" },
    ],
    certifications: [
      { name: "ADP (Adobe Certified Professional)", issuer: "Adobe", year: "2021" },
    ],
  },
  {
    email: "lee.backend@example.com",
    name: "이준혁",
    category: "DEVELOPER",
    headline: "Node·Python 백엔드 + AWS DevOps, 결제·웹훅 전문",
    bio: "토스페이먼츠·아임포트 통합 12회 이상. 결제 웹훅·환불·정산 로직 안정화 경험. AWS Lambda·SQS·RDS로 확장 가능한 아키텍처 설계.",
    skills: ["Node.js", "Python", "AWS", "PostgreSQL", "Redis", "결제 통합"],
    hourlyRateMin: 90000,
    hourlyRateMax: 150000,
    yearsOfExperience: 7,
    workMode: "REMOTE",
    industries: ["핀테크", "결제"],
    links: [{ label: "GitHub", url: "https://github.com/example-lee" }],
    location: "원격",
    careers: [
      {
        company: "PayLink (결제 인프라 스타트업)",
        role: "Backend Tech Lead",
        period: "2023.05 ~ 현재",
        summary: "토스페이먼츠·아임포트 통합 SDK 설계. 월 거래액 80억 처리. 결제 실패율 0.7% 유지.",
      },
      {
        company: "쿠팡 (Coupang)",
        role: "Backend Engineer",
        period: "2019.08 ~ 2023.04",
        summary: "주문·결제 마이크로서비스 운영. AWS Lambda + SQS 기반 비동기 처리. P99 latency 220ms → 80ms 개선.",
      },
    ],
    portfolioItems: [
      {
        title: "결제 웹훅 멱등성 라이브러리 (OSS)",
        role: "Author",
        stack: ["Node.js", "TypeScript", "Redis"],
        summary: "토스/카카오/네이버페이 웹훅을 일관된 인터페이스로 처리. GitHub Star 320+.",
        url: "https://github.com/example-lee/payment-webhook-kit",
      },
    ],
    education: [
      { school: "KAIST", degree: "전산학부 학사", period: "2013.03 ~ 2019.02" },
    ],
    certifications: [
      { name: "정보처리기사", issuer: "한국산업인력공단", year: "2019" },
    ],
  },
  {
    email: "choi.marketing@example.com",
    name: "최서연",
    category: "MARKETER",
    headline: "퍼포먼스 마케터 5년차, B2C 그로스 해킹",
    bio: "메타·구글 광고 운영 + GA4·Mixpanel 분석. 첫 100명·첫 1000명 단계의 그로스 실험 설계 경험 다수. 인스타그램·유튜브 콘텐츠 전략까지.",
    skills: ["Meta Ads", "Google Ads", "GA4", "Mixpanel", "콘텐츠 마케팅"],
    hourlyRateMin: 50000,
    hourlyRateMax: 80000,
    yearsOfExperience: 5,
    workMode: "HYBRID",
    industries: ["B2C 그로스", "이커머스"],
    links: [{ label: "LinkedIn", url: "https://linkedin.com/in/example-choi" }],
    location: "서울",
    careers: [
      {
        company: "마켓컬리 (Kurly)",
        role: "Growth Marketing Lead",
        period: "2022.04 ~ 현재",
        summary: "신규 가입자 retention 캠페인 책임. D7 retention 28% → 41%. 월 광고 예산 4억 운영.",
      },
      {
        company: "29CM",
        role: "Performance Marketer",
        period: "2020.06 ~ 2022.03",
        summary: "메타·구글 광고 + 카카오모먼트 운영. ROAS 580% 달성. 신규 카테고리 런칭 6건.",
      },
      {
        company: "프리랜서 마케팅",
        role: "Solo Marketer",
        period: "2019.01 ~ 2020.05",
        summary: "스타트업 12곳 그로스 컨설팅. 평균 가입 전환율 +35% 달성.",
      },
    ],
    portfolioItems: [
      {
        title: "마켓컬리 신규 가입 캠페인",
        role: "Lead Marketer",
        stack: ["Meta Ads", "GA4", "Mixpanel"],
        summary: "D7 retention 28% → 41%. ROAS 720%. 분기 가입자 +28%.",
        url: "",
      },
      {
        title: "29CM 새벽배송 런칭",
        role: "Performance Marketer",
        stack: ["Google Ads", "Mixpanel", "Braze"],
        summary: "런칭 첫 달 가입 1.2만명 확보. CAC 18,000원 → 9,500원 개선.",
        url: "",
      },
    ],
    education: [
      { school: "고려대학교", degree: "경영학 학사", period: "2014.03 ~ 2019.02" },
    ],
    certifications: [
      { name: "Google Ads 인증", issuer: "Google", year: "2021" },
      { name: "GA4 분석 인증", issuer: "Google", year: "2022" },
    ],
  },
  {
    email: "jung.ac@example.com",
    name: "정현우",
    category: "AC_MENTOR",
    headline: "전 시리즈A 창업자 → 액셀러레이터 파트너",
    bio: "B2C 모바일 스타트업 시리즈A 100억 유치 후 매각. 현재 액셀러레이터에서 시드~프리A 단계 창업가 멘토링 진행. IR 덱·재무모델·KPI 설계 강점.",
    skills: ["IR 컨설팅", "재무모델링", "KPI 설계", "투자 유치"],
    hourlyRateMin: null,
    hourlyRateMax: null,
    yearsOfExperience: 10,
    workMode: "HYBRID",
    industries: ["B2C 모바일", "투자/AC"],
    links: [{ label: "LinkedIn", url: "https://linkedin.com/in/example-jung" }],
    location: "서울",
    careers: [
      {
        company: "프라이머사제 (Primer Sazze)",
        role: "Partner",
        period: "2022.06 ~ 현재",
        summary: "시드~프리A 단계 스타트업 30+ 멘토링. 평균 후속 라운드 성공률 65%.",
      },
      {
        company: "Linkly (전 직장, 매각)",
        role: "Co-founder & CEO",
        period: "2017.04 ~ 2022.05",
        summary: "B2C 모바일 커머스. 시리즈A 100억 유치 후 2022년 카카오모빌리티에 인수.",
      },
    ],
    portfolioItems: [
      {
        title: "IR 덱 컨설팅 50건 누적",
        role: "Senior Advisor",
        stack: ["IR 덱", "재무모델", "KPI"],
        summary: "후속 라운드 성공 33건. 평균 라운드 사이즈 35억.",
        url: "",
      },
    ],
    education: [
      { school: "연세대학교", degree: "경영학 학사", period: "2008.03 ~ 2014.02" },
    ],
    certifications: [],
  },
  {
    email: "han.planner@example.com",
    name: "한지민",
    category: "PLANNER",
    headline: "B2C 서비스 기획자 7년차, 페르소나·MVP 정의",
    bio: "토스·당근에서 서비스 기획자로 7년. 사용자 인터뷰 → 페르소나 → MVP 기능 우선순위 워크숍 진행. 프리랜서 기획 14건 완료.",
    skills: ["서비스 기획", "사용자 리서치", "MVP 정의", "Figma 와이어프레임"],
    hourlyRateMin: 70000,
    hourlyRateMax: 100000,
    yearsOfExperience: 7,
    workMode: "HYBRID",
    industries: ["B2C 서비스", "모바일"],
    links: [{ label: "Notion 포트폴리오", url: "https://example.notion.site/han" }],
    location: "서울 (하이브리드)",
    careers: [
      {
        company: "프리랜서 서비스 기획",
        role: "Senior Product Planner",
        period: "2023.03 ~ 현재",
        summary: "B2C 모바일 14건 기획. 페르소나 정의 → MVP 기능 확정 → 디자인-개발 핸드오프까지.",
      },
      {
        company: "당근마켓",
        role: "Service Planner",
        period: "2020.04 ~ 2023.02",
        summary: "중고거래 안전결제 도입 PM. 사용자 인터뷰 60건 진행. 거래 분쟁율 22% 감소.",
      },
      {
        company: "토스 (Toss)",
        role: "Junior Planner",
        period: "2018.03 ~ 2020.03",
        summary: "송금 화면 UX 개선 워크숍 진행. KPI 트래킹 dashboard 설계.",
      },
    ],
    portfolioItems: [
      {
        title: "당근 안전결제 도입",
        role: "Lead Planner",
        stack: ["사용자 리서치", "Notion", "Figma"],
        summary: "분쟁율 22% 감소. 출시 6개월 만에 거래 5만건 적용.",
        url: "",
      },
    ],
    education: [
      { school: "서강대학교", degree: "경영학 학사", period: "2014.03 ~ 2018.02" },
    ],
    certifications: [],
  },
  {
    email: "yoo.flutter@example.com",
    name: "유서진",
    category: "DEVELOPER",
    headline: "Flutter·React Native 모바일 풀스택, 앱스토어 8개 출시",
    bio: "iOS·Android 동시 출시 경험 8회. Flutter 4년·RN 3년. 푸시 알림·인앱결제·소셜로그인까지 한 번에 셋업. 디자이너와의 협업 빠릅니다.",
    skills: ["Flutter", "React Native", "Dart", "Firebase", "App Store Connect"],
    hourlyRateMin: 70000,
    hourlyRateMax: 110000,
    yearsOfExperience: 5,
    workMode: "REMOTE",
    industries: ["모바일 앱", "B2C"],
    links: [{ label: "GitHub", url: "https://github.com/example-yoo" }],
    location: "원격",
    careers: [
      {
        company: "프리랜서 모바일 개발",
        role: "Mobile Tech Lead",
        period: "2022.07 ~ 현재",
        summary: "iOS+Android 동시 출시 8회. 평균 출시 기간 12주. 푸시·인앱결제·딥링크 셋업 포함.",
      },
      {
        company: "직방 (Zigbang)",
        role: "Mobile Engineer",
        period: "2020.03 ~ 2022.06",
        summary: "iOS 네이티브 → Flutter 마이그레이션. 코드 라인 32% 감소, 빌드 시간 18분 → 4분.",
      },
      {
        company: "야놀자",
        role: "Junior Mobile Engineer",
        period: "2018.09 ~ 2020.02",
        summary: "Android 객실 예약 화면 개발. 결제 SDK 통합 (KCP, NICE).",
      },
    ],
    portfolioItems: [
      {
        title: "라이프 트래킹 앱 \"Daily Log\"",
        role: "Solo Developer",
        stack: ["Flutter", "Riverpod", "Firebase"],
        summary: "출시 4개월 만에 누적 다운로드 12만. 앱스토어 라이프 부문 평점 4.7.",
        url: "https://apps.example.com/dailylog",
      },
      {
        title: "직방 Flutter 마이그레이션",
        role: "Tech Lead",
        stack: ["Flutter", "Dart"],
        summary: "iOS 네이티브 → Flutter 전체 전환. 빌드 시간 78% 단축.",
        url: "",
      },
    ],
    education: [
      { school: "한양대학교", degree: "컴퓨터공학 학사", period: "2014.03 ~ 2020.02" },
    ],
    certifications: [
      { name: "정보처리기사", issuer: "한국산업인력공단", year: "2020" },
    ],
  },
  {
    email: "song.brand@example.com",
    name: "송하늘",
    category: "DESIGNER",
    headline: "브랜드 디자이너 + 모션그래픽, 스타트업 50개 BI 작업",
    bio: "스타트업 BI·로고·키 비주얼 50개 이상. 미니멀·타이포 중심. After Effects 모션 영상 추가 가능 (런칭 영상 등).",
    skills: ["브랜드 아이덴티티", "로고", "Figma", "Adobe Illustrator", "After Effects"],
    hourlyRateMin: 60000,
    hourlyRateMax: 100000,
    yearsOfExperience: 6,
    workMode: "HYBRID",
    industries: ["브랜드", "스타트업 BI"],
    links: [{ label: "Behance", url: "https://www.behance.net/example-song" }],
    location: "서울",
    careers: [
      {
        company: "프리랜서 브랜드 디자인",
        role: "Brand Designer",
        period: "2021.05 ~ 현재",
        summary: "스타트업 BI·로고 50건. 시드~프리A 단계 고객 중심. 평균 작업 기간 3주.",
      },
      {
        company: "플러스엑스 (PlusX)",
        role: "Designer",
        period: "2018.07 ~ 2021.04",
        summary: "B2C 브랜드 12건 BI 작업. 모션그래픽 영상 + 키 비주얼 + 컬러 시스템.",
      },
    ],
    portfolioItems: [
      {
        title: "Doohu 브랜드 BI 시스템",
        role: "Brand Designer",
        stack: ["Figma", "Illustrator", "After Effects"],
        summary: "B2C 라이프스타일. 로고 + 컬러 시스템 + 모션 런칭 영상. 출시 후 인스타 팔로워 0→3만.",
        url: "",
      },
    ],
    education: [
      { school: "국민대학교", degree: "시각디자인 학사", period: "2014.03 ~ 2018.02" },
    ],
    certifications: [],
  },
  {
    email: "kang.pm@example.com",
    name: "강도현",
    category: "PM",
    headline: "PM 8년차 (시리즈B 핀테크 + B2B SaaS)",
    bio: "프로덕트 PM 8년. 로드맵 설계·분기 OKR·디자인-개발 인터페이스 정리에 강합니다. 시리즈B 핀테크에서 ARR 0→30억 성장에 기여.",
    skills: ["로드맵 설계", "OKR", "Linear", "Notion", "사용자 분석"],
    hourlyRateMin: 90000,
    hourlyRateMax: 150000,
    yearsOfExperience: 8,
    workMode: "ONSITE",
    industries: ["핀테크", "B2B SaaS"],
    links: [{ label: "LinkedIn", url: "https://linkedin.com/in/example-kang" }],
    location: "서울",
    careers: [
      {
        company: "토스증권",
        role: "Lead PM",
        period: "2022.01 ~ 현재",
        summary: "주식 거래 화면 로드맵 책임. ARR 0→30억 달성에 기여. 디자인-개발 4팀 OKR 조율.",
      },
      {
        company: "네이버 클로바",
        role: "Product Manager",
        period: "2018.02 ~ 2021.12",
        summary: "음성 인식 API 제품 PM. B2B 영업팀과 협업해 매출 70억 달성.",
      },
    ],
    portfolioItems: [
      {
        title: "토스증권 주문 흐름 v2",
        role: "Lead PM",
        stack: ["Linear", "Notion", "Figma"],
        summary: "분기 OKR 100% 달성. 주문 완료율 84% → 91% 개선.",
        url: "",
      },
    ],
    education: [
      { school: "포항공과대학교 (POSTECH)", degree: "산업경영공학 학사", period: "2010.03 ~ 2016.02" },
    ],
    certifications: [
      { name: "PMP (Project Management Professional)", issuer: "PMI", year: "2020" },
    ],
  },
  {
    email: "noh.content@example.com",
    name: "노유진",
    category: "MARKETER",
    headline: "콘텐츠 마케터 + 카피라이터, 브랜드 톤매뉴얼 작성",
    bio: "스타트업 4곳에서 콘텐츠 헤드. 인스타·블로그·뉴스레터 운영. 브랜드 톤매뉴얼 작성 경험 12건. SEO 키워드 리서치도 진행.",
    skills: ["콘텐츠 마케팅", "카피라이팅", "SEO", "뉴스레터", "브랜드 톤"],
    hourlyRateMin: 40000,
    hourlyRateMax: 70000,
    yearsOfExperience: 4,
    workMode: "REMOTE",
    industries: ["콘텐츠", "스타트업"],
    links: [{ label: "포트폴리오", url: "https://noh.studio" }],
    location: "원격",
  },
  {
    email: "im.devops@example.com",
    name: "임재훈",
    category: "DEVELOPER",
    headline: "DevOps + SRE, AWS·GCP·k8s 인프라 셋업",
    bio: "스타트업 인프라 셋업 30건. CI/CD·모니터링·보안 한 번에 구축. 비용 최적화로 30~50% 절감 사례 다수. 야근 줄이는 자동화 강점.",
    skills: ["AWS", "GCP", "Kubernetes", "Terraform", "GitHub Actions", "Sentry"],
    hourlyRateMin: 100000,
    hourlyRateMax: 160000,
    yearsOfExperience: 8,
    workMode: "REMOTE",
    industries: ["인프라/DevOps"],
    links: [{ label: "GitHub", url: "https://github.com/example-im" }],
    location: "원격",
  },
  {
    email: "moon.mentor@example.com",
    name: "문수아",
    category: "AC_MENTOR",
    headline: "여성 창업가 멘토 + 정부지원사업 컨설팅",
    bio: "여성기업종합지원센터 출신, 예비창업패키지·초기창업패키지 컨설팅 100건+. 사업계획서 작성·프레젠테이션 코칭 강점.",
    skills: ["사업계획서", "정부지원사업", "프레젠테이션 코칭", "여성창업"],
    hourlyRateMin: null,
    hourlyRateMax: null,
    yearsOfExperience: 12,
    workMode: "HYBRID",
    industries: ["여성창업", "정부지원사업"],
    links: [{ label: "K-Startup", url: "https://www.k-startup.go.kr" }],
    location: "서울 + 원격",
  },
];

type PostSeed = {
  authorEmail: string;
  category: PostCategory;
  title: string;
  content: string;
};

const POSTS: PostSeed[] = [
  {
    authorEmail: "kim.dev@example.com",
    category: "TEAM_RECRUIT",
    title: "[B2B SaaS] 풀스택 공동창업자 1명 모집 (시드 직전)",
    content: `안녕하세요. AI 기반 회의록 자동화 SaaS를 개발 중입니다.\n\n**현재 단계**\n- MVP 60% 완성, 베타 테스터 12명\n- 시드 라운드 4월 말 마감 예정\n\n**찾는 분**\n- React/Next.js 또는 Node 백엔드 3년 이상\n- 0→1 단계의 chaos를 즐기는 분\n- 지분 협의 가능 (5~15%)\n\n관심 있으시면 댓글 또는 DM 부탁드립니다.`,
  },
  {
    authorEmail: "park.designer@example.com",
    category: "OUTSOURCE_REQUEST",
    title: "[2주] 모바일 앱 메인 화면 4장 디자인 외주",
    content: `iOS/Android 앱 출시 직전이라 메인 4개 화면 (홈·검색·상세·마이페이지) 디자인이 필요합니다.\n\n- 다크 모드 우선\n- Figma 파일 + 컴포넌트 정리\n- 예산 200~300만원\n- 일정: 2주\n\n포트폴리오 링크 첨부해주시면 24시간 내 회신.`,
  },
  {
    authorEmail: "jung.ac@example.com",
    category: "AC_REQUEST",
    title: "[시드 준비] IR 덱 리뷰 + 투자자 매칭 도와주실 AC 찾습니다",
    content: `시드 라운드 준비 중인 핀테크 스타트업입니다.\n\n**현재 상태**\n- MAU 8000, ARR 추정 1억\n- IR 덱 v3 작성 완료\n\n**원하는 도움**\n- 덱 1차 리뷰 (구조·논리·수치)\n- 시드 단계 투자자 5~10명 소개\n- 약 6주 단기 컨설팅\n\n비용·계약 형태 모두 협의 가능합니다.`,
  },
  {
    authorEmail: "han.planner@example.com",
    category: "QUESTION",
    title: "MVP 기능 우선순위 결정, 어떻게 하셨나요?",
    content: `초기 단계에서 \"이거 다 만들어야 하나?\" 하는 기능이 30개 정도 나왔는데, 어떤 기준으로 5~7개로 줄이셨는지 궁금합니다.\n\n현재 사용자 인터뷰 12명 진행했고, MoSCoW로 분류 시도 중이긴 한데 객관적이지 않은 느낌이 있어서요.`,
  },
  {
    authorEmail: "lee.backend@example.com",
    category: "CASE_STUDY",
    title: "토스페이먼츠 웹훅, 실패 케이스 정리 (재시도·중복 처리)",
    content: `결제 통합하면서 만났던 토스 웹훅 이슈를 정리했습니다.\n\n1. 재시도가 최대 5회 들어옴 → 멱등성 키 필수\n2. 환불 시 결제 키와 매칭 → DB에 결제 키 인덱스\n3. 중복 처리 → \`SELECT FOR UPDATE\` + 트랜잭션\n\n자세한 코드는 댓글로 공유드릴게요.`,
  },
  {
    authorEmail: "yoo.flutter@example.com",
    category: "TEAM_RECRUIT",
    title: "[헬스케어] iOS 앱 개발자 1명 (Flutter 가능자 우대)",
    content: `여성 건강 트래킹 앱입니다.\n\n- 현재 안드로이드 출시, iOS 빌드 필요\n- Flutter면 좋고, RN/Swift 가능자도 환영\n- 풀타임 가능 (월 600~800), 또는 프리랜서 2개월\n\n팀: 개발 1·디자이너 1·기획 1 (모두 풀타임)`,
  },
  {
    authorEmail: "noh.content@example.com",
    category: "FREE_TALK",
    title: "한국 스타트업 뉴스레터 추천 받아요 (그로스·창업)",
    content: `오프라인 행사 가기 힘들어서 뉴스레터로만 정보 받고 있는데, 추천 부탁드립니다.\n\n저는 현재 구독 중:\n- 패스트벤처스 \"오티움\"\n- 8VC \"Daily\"\n- Lenny's Newsletter (영어)\n\n한국어로 그로스·B2B 다루는 거 더 있을까요?`,
  },
  {
    authorEmail: "moon.mentor@example.com",
    category: "AC_REQUEST",
    title: "[정부지원] 예비창업패키지 사업계획서 1차 검토 가능",
    content: `예비창업패키지 4월 모집 시작했습니다. 100건 이상 검토 경험 있고, 무료로 1차 review 5명 진행할게요.\n\n조건:\n- 4/15 이전 작성 완료된 초안\n- 5월 중순까지 PDF 회신\n- 댓글 또는 DM으로 신청\n\n선착순 5명 마감.`,
  },
  {
    authorEmail: "kang.pm@example.com",
    category: "IDEA_SHARE",
    title: "[아이디어] B2B 영업 자동화, 한국 시장에서 가능할까?",
    content: `Apollo.io·HubSpot 같은 영업 자동화가 한국에선 잘 안 되는 이유를 정리해봤습니다.\n\n1. CRM 사용률 자체가 낮음\n2. \"카톡으로 보내주세요\" 문화\n3. 데이터 출처가 흩어져 있음 (사람인·잡코리아 등)\n\n이거 풀어주는 한국형 솔루션 있으면 보고 싶어요. 다들 어떻게 영업하시나요?`,
  },

  // ── 아이디어 공유 (IDEA_SHARE) ────────────────────────
  {
    authorEmail: "han.planner@example.com",
    category: "IDEA_SHARE",
    title: "[아이디어] 1인 변호사 사무실용 AI 사건요약 SaaS",
    content: `로톡·로앤굿이 안 풀어준 영역. 1인 변호사 사무실 7곳 인터뷰 결과:\n\n- 평균 사건 한 건당 의뢰인 진술서 30~80장 정독\n- 핵심 쟁점 추리는데 2~4시간\n- 비서 없이 혼자 다 처리\n\n진술서 PDF 업로드 → 사건 요약·쟁점·증거 매칭 자동 생성. 월 5만원 정도면 즉시 결제할 시장이라고 봅니다.\n\nAI 윤리·개인정보 이슈만 풀면 한국 변호사 1만 5천 명이 잠재 시장.`,
  },
  {
    authorEmail: "noh.content@example.com",
    category: "IDEA_SHARE",
    title: "[아이디어] 인스타 릴스 기반 한국형 \"숏폼 레시피 마켓\"",
    content: `만개의레시피·해먹남녀가 글 기반인데, MZ는 텍스트 안 읽음.\n\n착안:\n- 인스타 릴스로 1분 레시피 찍는 홈쿡 크리에이터 폭증\n- 광고 수익 외엔 수익 X\n- 시청자도 \"재료 어디서 사지\" 매번 검색\n\n제안: 릴스 → 재료 자동 태깅 → 마켓컬리·SSG 즉시 장보기 + 크리에이터 수수료 셰어. 거래 수수료 7~10%.`,
  },
  {
    authorEmail: "yoo.flutter@example.com",
    category: "IDEA_SHARE",
    title: "[아이디어] 자영업자용 \"리뷰 응답 자동화\" 카카오 채널 봇",
    content: `네이버 플레이스 리뷰 응답이 사장님들에게 가장 큰 부담.\n\n- 리뷰 1건당 평균 응답 작성 5~7분\n- 부정 리뷰 응답이 가게 평점에 큰 영향\n- 외주 맡기기엔 톤이 안 맞음\n\nGPT로 사장님 가게 톤·맥락 학습 → 카톡으로 \"이렇게 답할까요?\" 제안. 월 1.9만원, 자영업자 50만 명이 잠재.`,
  },
  {
    authorEmail: "moon.mentor@example.com",
    category: "IDEA_SHARE",
    title: "[아이디어] 정부지원사업 자동 매칭 + 신청서 초안 AI",
    content: `예비·초기·재도약 등 K-Startup 사업만 200개 넘는데 본인에게 맞는 게 뭔지 모름.\n\n시도 가치 있는 구조:\n1. 사업자정보·업종·매출 입력 → 자격 매칭 자동\n2. 마감일·접수처·필수서류 알림\n3. 합격한 과거 사업계획서 RAG → 초안 작성\n\n작년 250조 정부지원사업 시장에서 1%만 잡아도 의미 있음.`,
  },

  // ── 질문 (QUESTION) ─────────────────────────────────
  {
    authorEmail: "kim.dev@example.com",
    category: "QUESTION",
    title: "솔로 창업 시작하기 전 6개월 동안 뭘 했어야 후회 없을까요?",
    content: `다음 달부터 솔로로 사업 시작합니다 (B2C SaaS). 지난 회사 퇴사 6개월 전 \"이거 미리 했으면 좋았을 텐데\" 하는 거 있으면 공유 부탁드립니다.\n\n저는 일단:\n- 예금 12개월치 모음\n- 기술 스택 결정 (Next.js + Supabase)\n- 공동창업자 후보 2명과 사전 대화\n\n빼먹은 거 있을까요?`,
  },
  {
    authorEmail: "park.designer@example.com",
    category: "QUESTION",
    title: "디자이너 → 창업가 전환, 기술 학습 어디부터 시작?",
    content: `Figma 5년차 디자이너입니다. AI로 \"내가 디자인한 화면 → 실제 코드\" 변환 도구가 많아져서 1인 창업 가능성이 높아 보입니다.\n\n- HTML/CSS만 조금 아는 수준\n- 백엔드는 전혀\n- v0·Cursor·Lovable 등 시도해봤는데 결국 어딘가는 막힘\n\n어디까지 직접 배우고 어디부터 외주 맡기는 게 합리적일까요?`,
  },
  {
    authorEmail: "kang.pm@example.com",
    category: "QUESTION",
    title: "공동창업자 지분 협의, 첫 미팅에서 어디까지 정해야 하나요?",
    content: `다음 주 공동창업자 후보와 첫 미팅입니다. 친한 사이인데 비즈니스 얘기는 처음이라 어색할 것 같은데, 첫 미팅에서:\n\n1. 지분 비율\n2. Vesting (4년 1 cliff?)\n3. 의사결정 권한\n4. 이탈 시 처리\n\n어디까지 첫 미팅에서 정하고, 어디부터 변호사 끼고 정식화하나요?`,
  },
  {
    authorEmail: "lee.backend@example.com",
    category: "QUESTION",
    title: "[기술] Supabase vs Firebase vs 자체 Postgres, 0→1 단계 추천?",
    content: `처음 제대로 백엔드 결정하려는데 셋 다 trade-off가 있어서 고민입니다.\n\n현재 상황:\n- 예상 사용자 첫 6개월 1000명 이하\n- 결제·인증·실시간 알림 필요\n- 개발자 1명 (저)\n\nSupabase(PG + 실시간)·Firebase(NoSQL)·자체 호스팅(EC2 + Postgres) 중 뭘 쓰셨나요?`,
  },
  {
    authorEmail: "im.devops@example.com",
    category: "QUESTION",
    title: "[법무] 1인 사업자 → 법인 전환 타이밍",
    content: `현재 1인 개인사업자. 매출 월 800만원 수준입니다. 법인 전환 시점 고민:\n\n- 세무사 의견은 \"매출 1억 넘으면 무조건\"\n- 다만 법인 전환 시 자산 이전·계약 재체결·통장 분리 등 비용 1000만원+\n- 외부 투자 받을 가능성 있다면 빨리 법인이 나음\n\n비슷한 단계에서 어떻게 결정하셨나요?`,
  },

  // ── 케이스 스터디 (CASE_STUDY) ────────────────────────
  {
    authorEmail: "noh.content@example.com",
    category: "CASE_STUDY",
    title: "[그로스] 인스타 광고 ROAS 800% 달성한 콘텐츠 패턴 5가지",
    content: `B2C 식품 브랜드 4개월 운영 결과, ROAS 800%(평균 200%)를 만든 광고 패턴 정리.\n\n1. \"고객 후기 + 자막\" 구조 — UGC 가공 형태\n2. 첫 1초에 \"가격 강조\" (29,000원이 이렇게)\n3. 칼라 대비 강한 사진 (배경 흰색 → 제품 색)\n4. 댓글 영역에 가격·구매 링크 댓글로 추가 (CTR ↑)\n5. CTA 버튼 \"지금 사기\" 대신 \"오늘 도착\"\n\n광고비 예산·소재 길이별 비교는 댓글로.`,
  },
  {
    authorEmail: "lee.backend@example.com",
    category: "CASE_STUDY",
    title: "[기술] AWS 비용 80% 절감한 4가지 변경 (월 320만 → 65만)",
    content: `시리즈A 직전 비용 압박 + AWS 청구서 충격.\n\n변경:\n1. RDS db.t3.large → t4g.medium (Graviton) — 35% 절감\n2. ALB 한 개 + Path-based routing으로 통합 (서비스 4개 → 1개)\n3. CloudWatch 로그 90일 → 14일 보관, 이후 S3 Glacier\n4. NAT Gateway 시간당 → VPC Endpoint로 교체 (S3·DynamoDB)\n\n결과: 월 320만 → 65만. 성능 영향 거의 없음.`,
  },
  {
    authorEmail: "park.designer@example.com",
    category: "CASE_STUDY",
    title: "[UX] 결제 화면 1단계 줄여서 전환율 14% → 22%",
    content: `B2C 모바일 앱 결제 흐름 개선.\n\n기존 (4단계): 장바구니 → 배송지 → 결제수단 → 확인\n\n개선 (3단계): 장바구니에 배송지·결제수단 인라인 → 확인\n\n추가 적용:\n- 배송지 \"기본 배송지\" 자동 선택 (변경 시에만 노출)\n- 결제수단 마지막 사용 자동 선택\n- \"결제하기\" 버튼이 always sticky bottom\n\n결과: 14% → 22% 전환율, 평균 결제 시간 92초 → 38초.`,
  },
  {
    authorEmail: "choi.marketing@example.com",
    category: "CASE_STUDY",
    title: "[리텐션] 첫 100명 → 1000명 단계의 retention 5가지 레버",
    content: `B2C SaaS 첫 1000명 모으는 동안 시도한 레버 정리. D7 retention 12% → 38%.\n\n1. **Onboarding 1분 demo** — 가입 직후 영상 1분 (skip 가능)\n2. **첫 액션 트리거** — \"첫 프로젝트 만들기\"를 가입 즉시 권유\n3. **3일째 자동 이메일** — 활용 못한 기능 1개 강조\n4. **\"지금 함께 사용 중\" 활성 사용자 카운트** — 사회적 증거\n5. **친구 초대 시 양쪽 보너스** — 50% off vs 무료 1개월 비교했더니 후자가 압승\n\n5번이 가장 큰 효과 (가입 30% 추가 발생).`,
  },

  // ── 자유 토크 (FREE_TALK) ────────────────────────────
  {
    authorEmail: "han.planner@example.com",
    category: "FREE_TALK",
    title: "솔로 창업 4개월차, 가장 외로운 순간은?",
    content: `4개월 전 회사 그만두고 솔로 창업 시작했는데, 외로움이 생각보다 크네요.\n\n가장 힘든 순간:\n- 결정해줄 사람이 아무도 없을 때 (모든 디테일을 혼자 판단)\n- 친구들이 \"잘 되어가?\" 물어볼 때 답하기 애매할 때\n- 새벽 3시에 \"내가 지금 뭐하고 있나\" 싶은 순간\n\n다들 어떻게 외로움 관리하시나요?`,
  },
  {
    authorEmail: "kang.pm@example.com",
    category: "FREE_TALK",
    title: "스타트업 사람들 책상 위에 뭐 있나요?",
    content: `심심해서 올려봅니다. 다들 책상 위에 뭐 있는지 궁금합니다.\n\n저는:\n- 스탠딩 데스크 (FlexiSpot)\n- 모니터 2개 (LG 27 + 32)\n- 로지텍 MX Master 3S\n- HHKB Pro 2\n- 1Password 키 (USB-C)\n- 멘탈 관리용 작은 화분 (산세베리아)\n\n사진 댓글로 부탁해요.`,
  },
  {
    authorEmail: "yoo.flutter@example.com",
    category: "FREE_TALK",
    title: "성수동 vs 강남 vs 판교, 창업가 모임 어디가 좋아요?",
    content: `네트워킹 모임 위치 결정 중입니다.\n\n- 성수: 트렌디·콘텐츠/디자인 많음, 주차 X\n- 강남: 핀테크·B2B 많음, 모임 장소 비쌈\n- 판교: 시리즈B+ 많음, 거리상 멀음\n\n다들 어디서 모이세요? 추천할 만한 정기 모임이나 공간 있으면 알려주세요.`,
  },
  {
    authorEmail: "im.devops@example.com",
    category: "FREE_TALK",
    title: "Cursor vs Windsurf vs Claude Code, 진짜 생산성 차이 있나요?",
    content: `Cursor 1년 쓰다가 Windsurf로 갈아탔는데 Claude Code 출시되고 다시 고민됩니다.\n\n각자 강점:\n- Cursor: UI 익숙·shortcut 많음\n- Windsurf: Cascade가 똑똑하긴 함\n- Claude Code: 터미널 친화적, agentic 잘 됨\n\n결국 셋 다 비슷한 것 같기도 하고. 다들 뭐 쓰시나요?`,
  },
];

async function ensureUser(email: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      email,
      name,
      password: await hashPassword(`demo-${Math.random().toString(36).slice(2, 10)}`),
      planType: "FREE",
      creditBalance: 50,
    },
  });
}

async function main() {
  console.log("[seed] 전문가 프로필 + 커뮤니티 글 시드 시작...\n");

  // 1. 전문가 프로필 12건
  const userMap = new Map<string, string>();
  for (const e of EXPERTS) {
    const u = await ensureUser(e.email, e.name);
    userMap.set(e.email, u.id);

    await prisma.expertProfile.upsert({
      where: { userId: u.id },
      create: {
        userId: u.id,
        category: e.category,
        headline: e.headline,
        bio: e.bio,
        skills: e.skills,
        hourlyRateMin: e.hourlyRateMin,
        hourlyRateMax: e.hourlyRateMax,
        links: e.links,
        location: e.location,
        yearsOfExperience: e.yearsOfExperience ?? null,
        workMode: e.workMode ?? null,
        industries: e.industries ?? [],
        careers: (e.careers ?? []) as unknown as Prisma.InputJsonValue,
        portfolioItems: (e.portfolioItems ?? []) as unknown as Prisma.InputJsonValue,
        education: (e.education ?? []) as unknown as Prisma.InputJsonValue,
        certifications: (e.certifications ?? []) as unknown as Prisma.InputJsonValue,
        available: true,
      },
      update: {
        category: e.category,
        headline: e.headline,
        bio: e.bio,
        skills: e.skills,
        hourlyRateMin: e.hourlyRateMin,
        hourlyRateMax: e.hourlyRateMax,
        links: e.links,
        location: e.location,
        yearsOfExperience: e.yearsOfExperience ?? null,
        workMode: e.workMode ?? null,
        industries: e.industries ?? [],
        careers: (e.careers ?? []) as unknown as Prisma.InputJsonValue,
        portfolioItems: (e.portfolioItems ?? []) as unknown as Prisma.InputJsonValue,
        education: (e.education ?? []) as unknown as Prisma.InputJsonValue,
        certifications: (e.certifications ?? []) as unknown as Prisma.InputJsonValue,
        available: true,
      },
    });
    console.log(`  ✓ ${e.name} (${e.category})`);
  }

  // 2. 커뮤니티 글 9개
  console.log("\n[seed] 커뮤니티 글 작성 중...");
  for (const p of POSTS) {
    const userId = userMap.get(p.authorEmail);
    if (!userId) {
      console.warn(`  ⚠ ${p.authorEmail} not found, skipped`);
      continue;
    }
    // 같은 제목 중복 방지
    const exists = await prisma.communityPost.findFirst({
      where: { title: p.title, authorId: userId },
    });
    if (exists) {
      console.log(`  - skipped (이미 존재): ${p.title.slice(0, 40)}...`);
      continue;
    }
    await prisma.communityPost.create({
      data: {
        authorId: userId,
        title: p.title,
        content: p.content,
        category: p.category,
      },
    });
    console.log(`  ✓ [${p.category}] ${p.title.slice(0, 40)}...`);
  }

  console.log(`\n=== 시드 완료 ===`);
  console.log(`  전문가: ${EXPERTS.length}명`);
  console.log(`  커뮤니티 글: ${POSTS.length}개`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
