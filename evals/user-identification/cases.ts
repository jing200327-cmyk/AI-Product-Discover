import type { UserIdentificationEvalCase } from "./types";

export const userIdentificationEvalCases: UserIdentificationEvalCase[] = [
  {
    case_id: "USER_ID_001",
    case_name: "用户明确的个人效率工具",
    difficulty: "easy",
    raw_idea:
      "我想做一个给独立开发者用的 AI 需求拆解工具，帮他们把一个模糊想法整理成开发任务。",
    extra_context: "无",
    test_focus: "是否能识别显性用户和个人工具角色重合。",
    expected_user_segments: [
      {
        segment_name: "独立开发者",
        user_identity: "个人开发者",
        current_stage: "有产品想法准备开发",
        main_goal: "把想法转为可执行任务",
        confidence: "high",
        mvp_priority: "high"
      },
      {
        segment_name: "早期创业者",
        user_identity: "兼任产品和开发的人",
        current_stage: "验证 MVP",
        main_goal: "快速整理需求",
        confidence: "medium",
        mvp_priority: "medium"
      }
    ],
    expected_core_user: {
      segment_name: "独立开发者",
      reason: "用户明确、痛点清晰、容易自助试用。"
    },
    expected_role_mapping: {
      user: "独立开发者本人",
      buyer: "独立开发者本人",
      decision_maker: "独立开发者本人",
      beneficiary: "独立开发者本人"
    },
    key_risks_to_identify: [
      "可能把创业者、产品经理、开发者都列为同等核心用户"
    ],
    expected_clarifying_questions: [
      "独立开发者是偏技术型、产品型，还是一人公司创业者？",
      "他们是在想法阶段、需求整理阶段，还是已经准备编码？",
      "他们当前用什么方式拆解需求？"
    ],
    common_bad_outputs: [
      "直接生成任务列表",
      "扩展成完整项目管理工具",
      "未区分核心/次级用户"
    ],
    scoring_notes: "核心用户应明确为独立开发者，不能泛化为“所有开发者”。"
  },
  {
    case_id: "USER_ID_002",
    case_name: "用户完全不明确的 AI 工具想法",
    difficulty: "easy",
    raw_idea: "我想做一个 AI 工具，可以帮人更快地做决定。",
    extra_context: "无",
    test_focus: "是否能识别用户不明确，并提出澄清问题。",
    expected_user_segments: [
      {
        segment_name: "职场个人决策者",
        user_identity: "需要处理工作选择的人",
        current_stage: "面临具体选择",
        main_goal: "降低决策成本",
        confidence: "low",
        mvp_priority: "medium"
      },
      {
        segment_name: "管理者",
        user_identity: "团队负责人",
        current_stage: "需要业务判断",
        main_goal: "提升决策质量",
        confidence: "low",
        mvp_priority: "low"
      }
    ],
    expected_core_user: {
      segment_name: "暂不应强行确定",
      reason: "原始想法缺少具体用户、场景和问题。",
      allow_uncertain: true
    },
    expected_role_mapping: {
      user: "无法确定",
      buyer: "无法确定，个人工具时可能同一人，B 端时可能分离",
      decision_maker: "无法确定",
      beneficiary: "无法确定"
    },
    key_risks_to_identify: [
      "用户过泛",
      "只有能力描述，没有用户对象",
      "不清楚个人还是企业场景"
    ],
    expected_clarifying_questions: [
      "“帮人做决定”的人具体是谁？",
      "决定发生在工作、学习、消费、创业还是管理场景？",
      "决策失败会带来什么代价？"
    ],
    common_bad_outputs: [
      "把“所有人”作为目标用户",
      "开始设计决策树功能",
      "没有指出不清晰"
    ],
    scoring_notes: "必须明确“当前用户定义不足”。不得强行确定唯一核心用户。"
  },
  {
    case_id: "USER_ID_003",
    case_name: "明确教育学习用户",
    difficulty: "easy",
    raw_idea:
      "做一个给考研学生用的 AI 错题复盘助手，能帮他们整理错因和薄弱知识点。",
    extra_context: "无",
    test_focus: "是否能识别教育学习类的显性用户。",
    expected_user_segments: [
      {
        segment_name: "考研备考学生",
        user_identity: "备考者",
        current_stage: "刷题复习阶段",
        main_goal: "提升复盘效率",
        confidence: "high",
        mvp_priority: "high"
      },
      {
        segment_name: "考研辅导老师",
        user_identity: "教学支持者",
        current_stage: "批改和指导阶段",
        main_goal: "辅助发现薄弱点",
        confidence: "medium",
        mvp_priority: "low"
      }
    ],
    expected_core_user: {
      segment_name: "考研备考学生",
      reason: "明确使用者，高频场景，个人工具路径清晰。"
    },
    expected_role_mapping: {
      user: "考研备考学生",
      buyer: "多为学生本人，也可能是家长",
      decision_maker: "学生本人",
      beneficiary: "学生本人，老师可能辅助受益"
    },
    key_risks_to_identify: ["不同考试科目、备考阶段差异较大"],
    expected_clarifying_questions: [
      "优先服务哪类考研学生：初期、冲刺期还是二战学生？",
      "他们主要复盘哪类题目？",
      "他们现在如何整理错题？"
    ],
    common_bad_outputs: [
      "泛化为“学生”",
      "设计完整在线教育平台",
      "忽略老师不是核心用户"
    ],
    scoring_notes: "核心用户必须具体到“考研备考学生”。"
  },
  {
    case_id: "USER_ID_004",
    case_name: "明确求职简历项目用户",
    difficulty: "easy",
    raw_idea: "我想做一个帮应届生把课程项目包装成简历项目的 AI 助手。",
    extra_context: "主要面向没有实习经历的人。",
    test_focus: "是否能识别求职简历项目类用户。",
    expected_user_segments: [
      {
        segment_name: "缺少实习经历的应届生",
        user_identity: "求职者",
        current_stage: "准备简历",
        main_goal: "提升项目表达质量",
        confidence: "high",
        mvp_priority: "high"
      },
      {
        segment_name: "转专业求职学生",
        user_identity: "求职者",
        current_stage: "构建作品集",
        main_goal: "证明能力",
        confidence: "medium",
        mvp_priority: "medium"
      }
    ],
    expected_core_user: {
      segment_name: "缺少实习经历的应届生",
      reason: "痛点明确，容易触达，验证标准清晰。"
    },
    expected_role_mapping: {
      user: "缺少实习经历的应届生",
      buyer: "通常为学生本人",
      decision_maker: "学生本人",
      beneficiary: "学生本人"
    },
    key_risks_to_identify: [
      "可能涉及简历真实性边界",
      "用户阶段和目标岗位需澄清"
    ],
    expected_clarifying_questions: [
      "优先服务哪个岗位方向？",
      "用户已有项目质量如何？",
      "目标是优化表达还是补齐项目内容？"
    ],
    common_bad_outputs: ["直接生成简历", "忽略真实性风险", "泛化为“求职者”"],
    scoring_notes: "必须识别“没有实习经历的应届生”这个核心限定。"
  },
  {
    case_id: "USER_ID_005",
    case_name: "用户过窄的个人需求",
    difficulty: "easy",
    raw_idea: "我想做一个只帮我自己每天整理 Notion 里产品想法的 AI。",
    extra_context: "目前只是我个人用。",
    test_focus: "是否能识别用户过窄和个人需求误判风险。",
    expected_user_segments: [
      {
        segment_name: "产品想法很多的个人创作者",
        user_identity: "个人使用者",
        current_stage: "想法收集阶段",
        main_goal: "整理想法",
        confidence: "medium",
        mvp_priority: "medium"
      },
      {
        segment_name: "独立开发者/产品经理",
        user_identity: "潜在扩展用户",
        current_stage: "持续记录想法",
        main_goal: "形成可执行方向",
        confidence: "low",
        mvp_priority: "low"
      }
    ],
    expected_core_user: {
      segment_name: "用户本人作为种子用户",
      reason: "当前只是个人使用，不宜立即判断市场核心用户。",
      allow_uncertain: true
    },
    expected_role_mapping: {
      user: "用户本人",
      buyer: "用户本人",
      decision_maker: "用户本人",
      beneficiary: "用户本人"
    },
    key_risks_to_identify: [
      "用户过窄",
      "个人需求不等于市场需求",
      "缺少外部用户验证"
    ],
    expected_clarifying_questions: [
      "除你之外，还有谁有类似想法整理痛点？",
      "这些人现在如何管理产品想法？",
      "你希望先做个人工具还是面向外部用户？"
    ],
    common_bad_outputs: [
      "直接扩展成大众 SaaS",
      "忽略“只帮我自己”",
      "不提示市场验证风险"
    ],
    scoring_notes: "必须识别过窄风险。"
  },
  {
    case_id: "USER_ID_006",
    case_name: "用户和客户混淆的 B 端想法",
    difficulty: "medium",
    raw_idea: "做一个给企业用的员工培训 AI，老板可以买来提升团队学习效率。",
    extra_context: "员工每天要完成内部课程。",
    test_focus: "是否能区分客户、使用者、决策者和受益者。",
    expected_user_segments: [
      {
        segment_name: "企业员工",
        user_identity: "一线使用者",
        current_stage: "接受内部培训",
        main_goal: "更快完成学习",
        confidence: "high",
        mvp_priority: "high"
      },
      {
        segment_name: "HR/培训负责人",
        user_identity: "管理者",
        current_stage: "管理培训效果",
        main_goal: "提升完成率",
        confidence: "high",
        mvp_priority: "medium"
      },
      {
        segment_name: "企业老板/部门负责人",
        user_identity: "购买/决策者",
        current_stage: "评估效率工具",
        main_goal: "提升组织能力",
        confidence: "medium",
        mvp_priority: "low"
      }
    ],
    expected_core_user: {
      segment_name: "企业员工或 HR/培训负责人",
      reason: "需要在员工学习体验和 HR 管理培训效果之间聚焦。",
      acceptable_alternatives: ["企业员工", "HR/培训负责人"]
    },
    expected_role_mapping: {
      user: "员工",
      buyer: "企业",
      decision_maker: "老板/HR",
      beneficiary: "员工与管理者"
    },
    key_risks_to_identify: [
      "用户和客户混淆",
      "B 端决策链不清",
      "员工是否愿意用未知"
    ],
    expected_clarifying_questions: [
      "MVP 优先解决员工学习体验，还是 HR 管理培训效果？",
      "谁负责采购和推动使用？",
      "员工当前培训最大阻力是什么？"
    ],
    common_bad_outputs: [
      "笼统写“企业用户”",
      "不区分老板和员工",
      "直接设计培训功能"
    ],
    scoring_notes: "角色区分是本 case 的关键。"
  },
  {
    case_id: "USER_ID_007",
    case_name: "企业内部提效工具",
    difficulty: "medium",
    raw_idea:
      "我们公司销售每周写周报很痛苦，我想做个 AI 自动帮他们生成销售周报。",
    extra_context: "销售主管也想看团队进展。",
    test_focus: "是否能识别企业内部一线使用者和管理受益者。",
    expected_user_segments: [
      {
        segment_name: "一线销售人员",
        user_identity: "使用者",
        current_stage: "每周汇报",
        main_goal: "减少写周报负担",
        confidence: "high",
        mvp_priority: "high"
      },
      {
        segment_name: "销售主管",
        user_identity: "决策/受益者",
        current_stage: "管理团队进展",
        main_goal: "快速掌握风险",
        confidence: "high",
        mvp_priority: "medium"
      }
    ],
    expected_core_user: {
      segment_name: "一线销售人员",
      reason: "痛点直接、高频、输入输出明确。"
    },
    expected_role_mapping: {
      user: "销售",
      buyer: "公司/部门",
      decision_maker: "销售主管",
      beneficiary: "销售和主管"
    },
    key_risks_to_identify: [
      "主管想看的内容可能与销售愿意填写的内容冲突"
    ],
    expected_clarifying_questions: [
      "销售最痛苦的是写作、整理数据，还是被管理检查？",
      "周报数据从哪里来？",
      "谁会决定是否推广？"
    ],
    common_bad_outputs: ["只服务主管", "忽略销售抵触心理", "扩展成 CRM"],
    scoring_notes: "应优先识别一线销售是核心使用者。"
  },
  {
    case_id: "USER_ID_008",
    case_name: "AI Agent 类产品",
    difficulty: "medium",
    raw_idea:
      "我想做一个 AI Agent，输入产品想法后自动做调研、竞品分析、PRD 和页面结构。",
    extra_context: "这个项目主要想放进作品集，也可能以后做成产品。",
    test_focus: "是否能识别 AI Agent 类多目标用户和作品集动机。",
    expected_user_segments: [
      {
        segment_name: "求职/转型的 AI 产品经理候选人",
        user_identity: "作品集建设者",
        current_stage: "准备项目作品",
        main_goal: "展示能力",
        confidence: "high",
        mvp_priority: "high"
      },
      {
        segment_name: "早期创业者",
        user_identity: "产品验证者",
        current_stage: "有想法待验证",
        main_goal: "快速形成发现文档",
        confidence: "medium",
        mvp_priority: "medium"
      },
      {
        segment_name: "独立开发者",
        user_identity: "构建者",
        current_stage: "准备开发 MVP",
        main_goal: "明确需求",
        confidence: "medium",
        mvp_priority: "medium"
      }
    ],
    expected_core_user: {
      segment_name: "求职/转型的 AI 产品经理候选人",
      reason: "额外上下文明确说明主要目标是作品集展示。"
    },
    expected_role_mapping: {
      user: "作品集阶段为用户本人",
      buyer: "作品集阶段为用户本人",
      decision_maker: "作品集阶段为用户本人",
      beneficiary: "用户本人；产品化阶段需重新区分"
    },
    key_risks_to_identify: [
      "作品集需求与商业产品需求混淆",
      "用户群体过多"
    ],
    expected_clarifying_questions: [
      "当前首要目标是作品集展示还是真实商业化？",
      "作品集评审者是谁？",
      "如果产品化，第一批真实用户是谁？"
    ],
    common_bad_outputs: [
      "直接按创业者做 SaaS",
      "忽略作品集目标",
      "开始设计全链路功能"
    ],
    scoring_notes: "必须识别“作品集”和“产品化”的用户差异。"
  },
  {
    case_id: "USER_ID_009",
    case_name: "创业验证类想法",
    difficulty: "medium",
    raw_idea:
      "给小餐饮老板做一个 AI 经营分析助手，帮他们看外卖评价、菜品销量和改进建议。",
    extra_context: "先想找几家朋友的店试用。",
    test_focus: "是否能识别创业验证中的触达优势和核心用户。",
    expected_user_segments: [
      {
        segment_name: "小餐饮门店老板",
        user_identity: "经营决策者",
        current_stage: "日常经营优化",
        main_goal: "提升销量和口碑",
        confidence: "high",
        mvp_priority: "high"
      },
      {
        segment_name: "店长/运营人员",
        user_identity: "使用者",
        current_stage: "处理门店运营",
        main_goal: "执行改进动作",
        confidence: "medium",
        mvp_priority: "medium"
      }
    ],
    expected_core_user: {
      segment_name: "小餐饮门店老板",
      reason: "购买、决策、受益高度集中，易于朋友店验证。"
    },
    expected_role_mapping: {
      user: "小餐饮门店老板或店长",
      buyer: "小餐饮门店老板",
      decision_maker: "小餐饮门店老板",
      beneficiary: "老板、店长和门店经营结果"
    },
    key_risks_to_identify: [
      "小餐饮数字化能力差异",
      "老板是否愿意看分析",
      "数据来源不清"
    ],
    expected_clarifying_questions: [
      "优先服务单店老板还是连锁店运营？",
      "老板目前如何看评价和销量？",
      "朋友店愿意提供哪些数据？"
    ],
    common_bad_outputs: [
      "泛化为餐饮行业",
      "忽略单店/连锁差异",
      "直接做经营方案"
    ],
    scoring_notes: "应把 MVP 核心用户缩到“小餐饮门店老板”。"
  },
  {
    case_id: "USER_ID_010",
    case_name: "只描述功能没有描述用户",
    difficulty: "medium",
    raw_idea:
      "做一个可以自动读取网页、总结重点、生成思维导图和待办事项的工具。",
    extra_context: "无",
    test_focus: "是否能从功能反推用户但标注为推断。",
    expected_user_segments: [
      {
        segment_name: "知识工作者",
        user_identity: "信息处理者",
        current_stage: "阅读资料后整理",
        main_goal: "提高信息转化效率",
        confidence: "medium",
        mvp_priority: "medium"
      },
      {
        segment_name: "学生/研究生",
        user_identity: "学习者",
        current_stage: "学习和写作准备",
        main_goal: "快速理解材料",
        confidence: "medium",
        mvp_priority: "medium"
      },
      {
        segment_name: "产品/运营人员",
        user_identity: "业务分析者",
        current_stage: "调研阶段",
        main_goal: "输出行动项",
        confidence: "low",
        mvp_priority: "low"
      }
    ],
    expected_core_user: {
      segment_name: "知识工作者或学生",
      reason: "原始想法只有功能，需要优先澄清使用者。",
      allow_uncertain: true,
      acceptable_alternatives: ["知识工作者", "学生/研究生"]
    },
    expected_role_mapping: {
      user: "待澄清，偏个人工具时角色可能同一人",
      buyer: "待澄清",
      decision_maker: "待澄清",
      beneficiary: "待澄清"
    },
    key_risks_to_identify: [
      "只有功能，没有用户",
      "多用户群体并存",
      "MVP 焦点不清"
    ],
    expected_clarifying_questions: [
      "谁最常需要把网页转成行动项？",
      "主要使用场景是学习、工作调研还是项目管理？",
      "用户现在用什么工具完成这件事？"
    ],
    common_bad_outputs: [
      "直接列功能模块",
      "把所有阅读网页的人作为目标用户",
      "不标推断"
    ],
    scoring_notes: "必须说明用户是推断而非显性信息。"
  },
  {
    case_id: "USER_ID_011",
    case_name: "用户群体过泛",
    difficulty: "medium",
    raw_idea: "做一个面向所有职场人的 AI 助手，帮他们提高工作效率。",
    extra_context: "我觉得任何岗位都会需要。",
    test_focus: "是否能识别用户过泛并拆分具体人群。",
    expected_user_segments: [
      {
        segment_name: "高频写作的职场人",
        user_identity: "文档产出者",
        current_stage: "日常办公",
        main_goal: "减少写作时间",
        confidence: "low",
        mvp_priority: "medium"
      },
      {
        segment_name: "项目经理/产品经理",
        user_identity: "协调者",
        current_stage: "多任务推进",
        main_goal: "管理信息和待办",
        confidence: "low",
        mvp_priority: "medium"
      },
      {
        segment_name: "销售/客服",
        user_identity: "沟通岗位",
        current_stage: "高频客户沟通",
        main_goal: "提升响应效率",
        confidence: "low",
        mvp_priority: "low"
      }
    ],
    expected_core_user: {
      segment_name: "暂不建议直接选择所有职场人",
      reason: "应缩小到高频场景人群。",
      allow_uncertain: true
    },
    expected_role_mapping: {
      user: "待澄清的具体职场细分人群",
      buyer: "可能是个人购买，也可能是企业采购",
      decision_maker: "待澄清",
      beneficiary: "待澄清"
    },
    key_risks_to_identify: [
      "用户过泛",
      "价值主张过泛",
      "无法设计 MVP 验证"
    ],
    expected_clarifying_questions: [
      "哪类职场人一天内最频繁遇到这个问题？",
      "你想先解决写作、会议、沟通、数据还是任务管理？",
      "这是个人效率工具还是企业内部工具？"
    ],
    common_bad_outputs: [
      "接受“所有职场人”",
      "输出通用功能大全",
      "无 MVP 聚焦"
    ],
    scoring_notes: "必须扣住“过泛”。"
  },
  {
    case_id: "USER_ID_012",
    case_name: "把自己的需求误认为市场需求",
    difficulty: "medium",
    raw_idea:
      "我每次写周报都很烦，所以想做一个 AI 周报生成器，应该很多人都需要。",
    extra_context: "我自己是产品经理。",
    test_focus: "是否能识别个人痛点外推风险。",
    expected_user_segments: [
      {
        segment_name: "需要定期写周报的产品经理",
        user_identity: "个人使用者",
        current_stage: "每周汇报",
        main_goal: "快速整理工作成果",
        confidence: "high",
        mvp_priority: "high"
      },
      {
        segment_name: "其他需要周报的职场人",
        user_identity: "潜在使用者",
        current_stage: "周期性汇报",
        main_goal: "减少汇报负担",
        confidence: "low",
        mvp_priority: "medium"
      },
      {
        segment_name: "管理者",
        user_identity: "受益者/决策者",
        current_stage: "查看团队进展",
        main_goal: "获取清晰汇报",
        confidence: "low",
        mvp_priority: "low"
      }
    ],
    expected_core_user: {
      segment_name: "需要定期写周报的产品经理",
      reason: "原始用户本人是产品经理，先聚焦同类知识工作者。"
    },
    expected_role_mapping: {
      user: "产品经理或同类周报撰写者",
      buyer: "个人工具时为本人，企业推广时为公司/部门",
      decision_maker: "个人或管理者",
      beneficiary: "撰写者和管理者"
    },
    key_risks_to_identify: [
      "自己的需求误判为市场需求",
      "泛化到很多人",
      "管理者需求未验证"
    ],
    expected_clarifying_questions: [
      "除你之外，哪些岗位同样痛苦且高频？",
      "用户愿意自己买，还是需要公司统一使用？",
      "管理者对周报格式和内容有什么要求？"
    ],
    common_bad_outputs: [
      "直接说市场很大",
      "生成周报功能",
      "不提示个人经验外推风险"
    ],
    scoring_notes: "应识别“我自己是产品经理”对核心用户判断的影响。"
  },
  {
    case_id: "USER_ID_013",
    case_name: "复杂 B 端多角色链路",
    difficulty: "hard",
    raw_idea:
      "做一个医院病区的 AI 护理排班和风险提醒系统，让护士少加班，也让护士长更好管理。",
    extra_context: "医院信息科可能负责采购，科室主任会参与决策。",
    test_focus: "是否能准确拆分 B 端多角色。",
    expected_user_segments: [
      {
        segment_name: "一线护士",
        user_identity: "使用者/受益者",
        current_stage: "病区排班和风险处理",
        main_goal: "减少加班和遗漏",
        confidence: "high",
        mvp_priority: "high"
      },
      {
        segment_name: "护士长",
        user_identity: "管理使用者/决策影响者",
        current_stage: "管理排班",
        main_goal: "优化人力安排",
        confidence: "high",
        mvp_priority: "high"
      },
      {
        segment_name: "医院信息科",
        user_identity: "采购/集成方",
        current_stage: "系统采购",
        main_goal: "合规接入",
        confidence: "high",
        mvp_priority: "low"
      },
      {
        segment_name: "科室主任",
        user_identity: "决策者",
        current_stage: "科室管理",
        main_goal: "降低风险",
        confidence: "medium",
        mvp_priority: "low"
      }
    ],
    expected_core_user: {
      segment_name: "护士长 + 一线护士",
      reason: "MVP 访谈应优先护士长和一线护士，采购角色不是核心使用者。"
    },
    expected_role_mapping: {
      user: "护士/护士长",
      buyer: "医院",
      decision_maker: "信息科/科室主任",
      beneficiary: "护士、管理者、患者"
    },
    key_risks_to_identify: [
      "医疗 B 端决策链复杂",
      "合规和系统接入影响用户判断",
      "使用者和采购者分离"
    ],
    expected_clarifying_questions: [
      "MVP 是先解决护士排班，还是护士长风险管理？",
      "谁会每天实际操作系统？",
      "医院采购和试点需要哪些角色批准？",
      "患者安全风险是否是核心评估指标？"
    ],
    common_bad_outputs: [
      "只写“医院用户”",
      "忽略信息科",
      "把患者当直接用户",
      "直接设计排班算法"
    ],
    scoring_notes: "角色链路拆分必须准确。"
  },
  {
    case_id: "USER_ID_014",
    case_name: "多类用户并存的市场工具",
    difficulty: "hard",
    raw_idea:
      "做一个 AI 市场调研平台，产品经理、创业者、咨询顾问、投资人都可以用，一键生成行业分析。",
    extra_context: "想先做 MVP，但不知道先服务谁。",
    test_focus: "是否能避免把所有用户都列为核心用户。",
    expected_user_segments: [
      {
        segment_name: "早期创业者",
        user_identity: "创业验证者",
        current_stage: "判断机会",
        main_goal: "快速了解市场",
        confidence: "high",
        mvp_priority: "high"
      },
      {
        segment_name: "产品经理",
        user_identity: "产品调研者",
        current_stage: "需求/竞品调研",
        main_goal: "输出产品判断",
        confidence: "high",
        mvp_priority: "high"
      },
      {
        segment_name: "咨询顾问",
        user_identity: "交付者",
        current_stage: "项目交付",
        main_goal: "提升报告效率",
        confidence: "high",
        mvp_priority: "medium"
      },
      {
        segment_name: "投资人",
        user_identity: "决策者",
        current_stage: "投前判断",
        main_goal: "辅助投资判断",
        confidence: "medium",
        mvp_priority: "low"
      }
    ],
    expected_core_user: {
      segment_name: "产品经理或早期创业者",
      reason: "需要根据触达和验证目标在两者中二选一。",
      acceptable_alternatives: ["产品经理", "早期创业者"]
    },
    expected_role_mapping: {
      user: "产品经理/创业者/咨询顾问/投资人中的优先细分",
      buyer: "个人/小团队场景角色重合；机构场景可能分离",
      decision_maker: "个人或机构负责人",
      beneficiary: "实际调研产物使用者"
    },
    key_risks_to_identify: [
      "多用户群体并存",
      "MVP 焦点不清",
      "不同用户的成功标准不同"
    ],
    expected_clarifying_questions: [
      "你最容易触达哪一类用户做试用？",
      "MVP 的成功标准是节省时间、提升报告质量，还是辅助决策？",
      "哪类用户愿意为不完整但可用的 MVP 付费或反馈？"
    ],
    common_bad_outputs: [
      "四类用户都设为核心",
      "直接做行业分析功能",
      "忽略成功标准差异"
    ],
    scoring_notes: "必须给出聚焦建议。"
  },
  {
    case_id: "USER_ID_015",
    case_name: "用户过窄但可能扩展的垂直场景",
    difficulty: "hard",
    raw_idea:
      "给杭州滨江区做跨境女装 TikTok 小卖家的库存预警 SaaS，最好能自动提醒补货。",
    extra_context: "我认识几个这样的卖家，但不确定市场够不够大。",
    test_focus: "是否能识别过窄用户和可扩展边界。",
    expected_user_segments: [
      {
        segment_name: "杭州滨江跨境女装 TikTok 小卖家",
        user_identity: "种子用户",
        current_stage: "小规模经营",
        main_goal: "避免断货和积压",
        confidence: "high",
        mvp_priority: "high"
      },
      {
        segment_name: "跨境服饰类小卖家",
        user_identity: "可扩展核心用户",
        current_stage: "多平台经营",
        main_goal: "管理库存风险",
        confidence: "medium",
        mvp_priority: "high"
      },
      {
        segment_name: "跨境电商运营团队",
        user_identity: "团队使用者",
        current_stage: "成熟运营",
        main_goal: "提升库存周转",
        confidence: "medium",
        mvp_priority: "medium"
      }
    ],
    expected_core_user: {
      segment_name: "杭州滨江跨境女装 TikTok 小卖家",
      reason:
        "先用已认识的种子用户验证，再评估扩展到跨境服饰小卖家。"
    },
    expected_role_mapping: {
      user: "小卖家店主或运营人员",
      buyer: "小卖家店主",
      decision_maker: "小卖家店主；团队场景可能是运营负责人",
      beneficiary: "店主、运营人员和库存周转结果"
    },
    key_risks_to_identify: [
      "地域和品类过窄",
      "样本偏差",
      "平台/品类差异可能很大"
    ],
    expected_clarifying_questions: [
      "这些卖家是否都有真实断货或积压损失？",
      "TikTok 女装卖家与其他跨境服饰卖家的库存逻辑是否相同？",
      "店主本人操作，还是有运营人员负责库存？",
      "你希望先验证本地种子用户，还是更大的跨境卖家市场？"
    ],
    common_bad_outputs: [
      "直接否定市场太小",
      "直接扩展到所有跨境卖家",
      "忽略种子用户价值"
    ],
    scoring_notes: "应平衡“过窄风险”和“种子验证价值”。"
  }
];
