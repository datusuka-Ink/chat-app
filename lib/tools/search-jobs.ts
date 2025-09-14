import { z } from 'zod';

export const searchJobsSchema = z.object({
  q: z.string().optional().describe('検索キーワード'),
  location: z.string().optional().describe('勤務地（東京、大阪、リモートなど）'),
  skills: z.array(z.string()).optional().describe('スキル（React、Node.js、Pythonなど）'),
  seniority: z.enum(['junior', 'mid', 'senior']).optional().describe('経験レベル'),
});

export type SearchJobsInput = z.infer<typeof searchJobsSchema>;

export interface JobItem {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  skills?: string[];
  seniority?: 'junior' | 'mid' | 'senior';
  description?: string;
  recruitmentPage?: string; // 企業募集ページ
  isPublic?: boolean; // 公開求人かどうか
  publicAgent?: string; // 公開求人のエージェント
  privateAgent?: string; // 非公開求人のエージェント
  requiredSkills?: string[]; // 必須スキル
  contractDate?: string; // 契約日
  placementHistory?: { // 過去の配属実績
    year: number;
    count: number;
  }[];
  salaryNegotiation?: { // 年収交渉実績
    min: number;
    max: number;
    average: number;
  };
  benefits?: string[]; // 特別待遇
  interviewPrep?: { // 面接対策内容
    topics: string[];
    materials: string[];
  };
  salary?: string; // 年収情報
  employmentType?: string; // 雇用形態
}

// 美容クリニック業界の求人データ
const MOCK_JOBS: JobItem[] = [
  {
    id: '1',
    title: '受付カウンセラー',
    company: 'Aクリニック',
    location: '東京',
    url: 'https://recruit.a-clinic.net/recruit_concierge.html#conts_essentials',
    recruitmentPage: 'https://recruit.a-clinic.net/recruit_concierge.html#conts_essentials',
    isPublic: true,
    publicAgent: '美容クリニックでは、かなり高年収の求人になります！\n美容経験なしでも勤務可能！\n社員割引があり、働きながら美しくなれます。',
    privateAgent: '女性限定\n社会人経験1年以上必須',
    skills: ['接客', 'コミュニケーション', 'カウンセリング'],
    requiredSkills: ['社会人経験1年以上'],
    seniority: 'junior',
    description: '美容クリニックの受付カウンセラー業務。患者様の受付、カウンセリング、予約管理など。',
    contractDate: '2024年8月20日',
    placementHistory: [
      { year: 2024, count: 3 }
    ],
    salaryNegotiation: {
      min: 300,
      max: 400,
      average: 350
    },
    benefits: ['書類選考免除', '社員割引', '美容施術割引'],
    interviewPrep: {
      topics: ['書類添削あり', '質問把握'],
      materials: ['面接対策資料', '過去の質問集']
    },
    salary: '年収300万円〜400万円',
    employmentType: '正社員',
  },
  {
    id: '2',
    title: 'コンシェルジュ',
    company: 'The clinic',
    location: '東京',
    url: 'https://recruit.theclinic.jp/work/concierge.html',
    recruitmentPage: 'https://recruit.theclinic.jp/work/concierge.html',
    isPublic: true,
    publicAgent: '他の美容クリニックに比べて技術力が高く、美容の知識が深まります。\n上司の方も話しやすく、迅速にご対応くださります。',
    privateAgent: '女性限定\n接客経験1年以上は欲しい',
    skills: ['コミュニケーション', '接客', 'カウンセリング'],
    requiredSkills: ['コミュニケーションスキル', '接客経験1年以上'],
    seniority: 'junior',
    description: '美容クリニックのコンシェルジュ業務。患者様のご案内、カウンセリング、施術説明など。',
    contractDate: '2025年7月21日',
    placementHistory: [
      { year: 2025, count: 1 }
    ],
    salaryNegotiation: {
      min: 320,
      max: 420,
      average: 370
    },
    benefits: ['SPI対策あり', '技術研修充実', '社員割引'],
    interviewPrep: {
      topics: ['SPI対策'],
      materials: ['SPI対策問題集', '面接対策資料']
    },
    salary: '年収320万円〜420万円',
    employmentType: '正社員',
  },
  {
    id: '3',
    title: 'コンシェルジュ（六本木院）',
    company: '聖心美容クリニック',
    location: '東京・六本木',
    url: 'https://recruit.biyougeka.com/recruit/sapporo-concierge/',
    recruitmentPage: 'https://recruit.biyougeka.com/recruit/sapporo-concierge/',
    isPublic: true,
    publicAgent: '有名インフルエンサーなど多数来院する老舗クリニックです。\n駅近なので通勤も楽です。\n老舗のクリニックで学びたい方におすすめです！',
    privateAgent: '女性限定\n学ぶ意欲がある人がいい',
    skills: ['接客', '美容知識', 'カウンセリング'],
    requiredSkills: ['美容クリニックでの経験'],
    seniority: 'junior',
    description: '老舗美容クリニックでのコンシェルジュ業務。VIP対応、カウンセリング、施術管理など。',
    contractDate: '2025年7月21日',
    placementHistory: [
      { year: 2025, count: 1 }
    ],
    salaryNegotiation: {
      min: 350,
      max: 450,
      average: 400
    },
    benefits: ['選考フロー把握', '書類添削あり', '面接官把握', '質問把握'],
    interviewPrep: {
      topics: ['選考フロー把握', '書類添削あり', '面接官把握', '質問把握'],
      materials: ['面接対策資料', '過去の質問集', '面接官情報']
    },
    salary: '年収350万円〜450万円',
    employmentType: '正社員',
  },
  {
    id: '4',
    title: '看護師',
    company: '新宿駅三丁目クリニック',
    location: '東京・新宿',
    url: 'https://job-medley.com/ans/805956/?ref_page=facility&ref_target=wanted',
    recruitmentPage: 'https://job-medley.com/ans/805956/?ref_page=facility&ref_target=wanted',
    isPublic: true,
    publicAgent: 'チョコザップグループ企業なので安定の運営基盤！！\n設備も最新で、好立地！\n休憩時間には最新の自動椅子で仮眠できたり楽しい職場です。',
    privateAgent: '業績が良くないく、看護師がいないと業績が上がらないため、免許があれば誰でも受かる',
    skills: ['看護', '医療知識', '患者対応'],
    requiredSkills: ['看護師免許'],
    seniority: 'junior',
    description: '美容クリニックでの看護師業務。施術サポート、患者ケア、医療機器管理など。',
    contractDate: '2023年7月21日',
    placementHistory: [
      { year: 2023, count: 8 }
    ],
    salaryNegotiation: {
      min: 300,
      max: 350,
      average: 350
    },
    benefits: ['一次面接免除', '最新設備', '休憩室完備', 'グループ企業福利厚生'],
    interviewPrep: {
      topics: ['選考フロー把握'],
      materials: ['面接対策資料', '選考フロー説明書']
    },
    salary: '年収350万円（交渉実績：300万オファー→350万内定）',
    employmentType: '正社員',
  },
  {
    id: '5',
    title: '受付',
    company: '東京中央美容外科',
    location: '東京・全国',
    url: 'https://tcj-clinic.com/staff/requirements/reception',
    recruitmentPage: 'https://tcj-clinic.com/staff/requirements/reception',
    isPublic: true,
    publicAgent: '知名度抜群。安心の大手企業です。\n充実のマニュアルがあるため業界未経験でも安心です。\n美容好きに大人気！',
    privateAgent: '7月に大量離職が発生したため、急募集。',
    skills: ['接客', 'カウンセリング', '事務処理'],
    requiredSkills: [],
    seniority: 'junior',
    description: '大手美容クリニックでの受付業務。患者様対応、予約管理、カウンセリングサポートなど。',
    contractDate: '2023年7月21日',
    placementHistory: [
      { year: 2023, count: 3 }
    ],
    salaryNegotiation: {
      min: 280,
      max: 380,
      average: 330
    },
    benefits: ['書類選考免除', '充実のマニュアル', '未経験歓迎', '全国展開'],
    interviewPrep: {
      topics: ['選考フロー把握', '書類添削あり'],
      materials: ['面接対策資料', '書類添削サービス']
    },
    salary: '年収280万円〜380万円',
    employmentType: '正社員',
  },
];

export async function searchJobs(input: SearchJobsInput): Promise<{
  items: Array<JobItem & { score: number }>;
}> {
  // スコアリング関数
  const calculateScore = (job: JobItem): number => {
    let score = 0;

    // 位置マッチング
    if (input.location) {
      if (job.location.toLowerCase().includes(input.location.toLowerCase())) {
        score += 30;
      }
      if (input.location.toLowerCase().includes('リモート') && job.location.includes('リモート')) {
        score += 40;
      }
    }

    // スキルマッチング
    if (input.skills && job.skills) {
      const matchedSkills = input.skills.filter(skill =>
        job.skills?.some(jobSkill =>
          jobSkill.toLowerCase().includes(skill.toLowerCase())
        )
      );
      score += matchedSkills.length * 20;
    }

    // 経験レベルマッチング
    if (input.seniority && job.seniority === input.seniority) {
      score += 25;
    }

    // キーワードマッチング
    if (input.q) {
      const query = input.q.toLowerCase();
      if (job.title.toLowerCase().includes(query)) {
        score += 30;
      }
      if (job.description?.toLowerCase().includes(query)) {
        score += 15;
      }
      if (job.company.toLowerCase().includes(query)) {
        score += 10;
      }
    }

    return score;
  };

  // スコアリングとソート
  const scoredJobs = MOCK_JOBS
    .map(job => ({
      ...job,
      score: calculateScore(job),
    }))
    .filter(job => job.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // 上位3件

  // スコアが0の場合、ランダムで3件返す
  if (scoredJobs.length === 0) {
    const randomJobs = [...MOCK_JOBS]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(job => ({ ...job, score: 10 }));
    return { items: randomJobs };
  }

  return { items: scoredJobs };
}