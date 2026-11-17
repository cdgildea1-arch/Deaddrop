/* ===== Curriculum content: Clinical Foundations Pathway (fictional demo content) ===== */
const SEED_MODULES = [
/* ---------------- MODULE 1 ---------------- */
{id:'m1',courseId:'c1',num:1,title:'Ethics & Professional Boundaries',category:'Professional ethics',minutes:120,prereq:null,
 summary:'Apply a structured ethical decision-making model to everyday dilemmas around consent, confidentiality, and boundaries.',
 objectives:['Apply a step-by-step ethical decision-making model','Explain informed consent as an ongoing process, not a form','Identify common limits of confidentiality and when to consult','Distinguish boundary crossings from boundary violations','Evaluate multiple-relationship risks in small communities and online'],
 lessons:[
  {type:'text',title:'A decision-making model you can actually use',html:`
   <p>Most ethical problems in counseling don’t announce themselves. They show up as a late-night message, a gift at termination, or a request from a family member. A consistent model slows you down just enough to think clearly.</p>
   <ol><li><b>Name the problem.</b> What exactly is the conflict, and whose interests are involved?</li>
   <li><b>Check the standards.</b> Review the ACA Code of Ethics, your state board rules (in Texas, 22 TAC Chapter 681), agency policy, and relevant law.</li>
   <li><b>Identify the principles in tension.</b> Autonomy, nonmaleficence, beneficence, justice, fidelity, and veracity often pull in different directions.</li>
   <li><b>Generate options.</b> Aim for at least three, including "do nothing yet."</li>
   <li><b>Consider consequences</b> for the client, the relationship, you, and the profession.</li>
   <li><b>Consult.</b> Bring it to your supervisor or a trusted colleague, and document that you did.</li>
   <li><b>Act, document, and reflect.</b> Record your reasoning, not just your decision.</li></ol>
   <div class="keypoint"><b>Key idea:</b> A defensible decision is one you can explain step by step. "It felt right" is not documentation.</div>`},
  {type:'video',title:'Informed consent is a process',duration:'8 min',html:`
   <p><b>Video summary.</b> Informed consent begins before the first session and continues throughout treatment. Clients should understand:</p>
   <ul><li>The nature, goals, and likely length of services, and the client’s right to decline or stop</li>
   <li>Fees, cancellation policy, and how to reach you (and how <i>not</i> to reach you)</li>
   <li>Limits of confidentiality, explained in plain language</li>
   <li>Your credentials. An LPC Associate practices under supervision, and the client should know that and know who the supervisor is.</li>
   <li>How technology, records, and telehealth are handled</li></ul>
   <div class="keypoint">Revisit consent whenever something changes: a new modality, a change in fees, a family member joining sessions, or a move to telehealth.</div>`},
  {type:'text',title:'Confidentiality and its limits',html:`
   <p>Confidentiality is the default. Exceptions are narrow, and they’re defined by law, rules, and policy rather than by your judgment alone. Common categories include:</p>
   <ul><li>Imminent risk of harm to self or others, handled according to law and your setting’s procedures</li>
   <li>Mandated reporting of suspected abuse or neglect of a child, an elderly person, or a person with a disability</li>
   <li>Valid court orders, and other disclosures required by law</li>
   <li>Disclosures the client authorizes in writing</li></ul>
   <p>When a disclosure is required, share the <b>minimum necessary</b> information. When you’re unsure, consult before you disclose.</p>
   <div class="keypoint"><b>Practice habit:</b> Explain the limits at intake in plain language, then check that the client actually understood them.</div>`},
  {type:'sort',title:'Exercise: Crossing or violation?',intro:'Select a statement, then select the category where it belongs. A boundary <b>crossing</b> can be acceptable when it’s purposeful, client-centered, and discussed. A <b>violation</b> exploits the relationship or puts the client at risk.',
   buckets:['Boundary crossing: evaluate, consult & document','Boundary violation: avoid'],
   items:[
    {t:'Accepting a small handmade card at the final session',b:0},
    {t:'Attending a client\'s graduation at their request, after discussing it in supervision',b:0},
    {t:'Going into business with a current client',b:1},
    {t:'Sending a friend request to a client on a personal social account',b:1},
    {t:'Brief self-disclosure that serves a clear therapeutic purpose',b:0},
    {t:'Telling a client about your own divorce at length because you needed to talk',b:1}]},
  {type:'worksheet',title:'Worksheet: Ethical decision-making',fileName:'Ethical-Decision-Making-Worksheet',intro:'A one-page template to use with any dilemma. Bring it to supervision.',
   sections:[{h:'1. The problem',p:['What is the dilemma, in one sentence?','Who is affected?']},{h:'2. Standards',p:['Relevant ACA Code sections','Relevant board rules or law','Agency policy']},{h:'3. Principles in tension',p:['Which principles conflict?']},{h:'4. Options & consequences',p:['Option A:','Option B:','Option C:']},{h:'5. Consultation',p:['Who did I consult, and when?','What did they recommend?']},{h:'6. Decision & documentation',p:['What I will do and why:','Follow-up date:']}]}
 ],
 scenario:{title:'The late-night message',client:'Dana',setup:'Dana (a fictional client, age 34) has seen you for eight sessions to work on anxiety and a recent breakup. At 10:40 p.m. you get a direct message on your <b>personal</b> social media account.',
  start:'a',nodes:{
   a:{lines:[{w:'client',t:'"Hey, I know this is weird but I really need to talk. Are you around?"'},{w:'narr',t:'You aren\'t on call. Your agency has a written after-hours procedure, and you reviewed it with Dana at intake.'}],
    choices:[
     {t:'Reply in the DM to check in and see what\'s going on.',q:'mixed',fb:'You care about Dana, and checking in feels kind. But replying on a personal account blurs the professional frame, uses an unsecured channel, and sets an expectation that you’re available after hours.',next:'b'},
     {t:'Don\'t reply from the personal account. Follow the agency\'s after-hours procedure: send the approved message with crisis resources (call or text 988, or 911 in an emergency) and the next available contact.',q:'good',fb:'Good. You stay inside the professional frame and still respond to a possible need. Dana gets immediate resources plus a clear path to care, through an approved channel.',next:'b'},
     {t:'Ignore it and raise it at the next session.',q:'poor',fb:'Ignoring it avoids the boundary problem but leaves a possible safety need unaddressed. Your procedure exists precisely for this situation.',next:'b'}]},
   b:{lines:[{w:'narr',t:'Two days later, at your scheduled session.'},{w:'client',t:'"Honestly, I felt kind of hurt about the other night. I thought we had a real connection."'}],
    choices:[
     {t:'"It\'s against policy, so I can\'t do that." Then move on to the agenda.',q:'mixed',fb:'It’s accurate but defensive. Dana may hear rejection rather than care, and you miss a chance to strengthen the relationship.',next:'c'},
     {t:'Validate the feeling, revisit the communication part of informed consent, and work with Dana on an after-hours support plan.',q:'good',fb:'Excellent. You treat the rupture as clinical material, clarify the boundary warmly, and leave Dana with a usable plan for hard nights.',next:'c'},
     {t:'Apologize and give Dana your personal cell number "just for emergencies."',q:'poor',fb:'This is a boundary violation in the making. It creates dual expectations, privacy risks, and dependence, and it doesn’t meet a true emergency any better than 988 or 911 would.',next:'c'}]},
   c:{lines:[{w:'narr',t:'After the session you consider what to do next.'}],
    choices:[
     {t:'Write a factual note (the message, your response, and the plan you made) and bring it to supervision this week.',q:'good',fb:'Right. Documenting facts and consulting protects Dana, you, and the continuity of care.',next:null},
     {t:'Nothing really happened, so there\'s no need to document it.',q:'poor',fb:'Boundary-relevant contact, and the plan that followed it, belongs in the record. Undocumented events are the hardest to defend later.',next:null}]}
  }},
 quiz:[
  {q:'Which step comes first in most ethical decision-making models?',o:['Consult a colleague','Identify and define the problem','Choose the least risky option','Document the decision'],a:1,why:'You can\'t check standards or generate options until you\'ve clearly named the problem and who it affects.'},
  {q:'An LPC Associate begins seeing a new client. Which disclosure is most important to include in informed consent?',o:['The associate\'s personal hobbies','That the associate practices under supervision, and who the supervisor is','The associate\'s graduate GPA','Nothing extra; it\'s the same as for a fully licensed counselor'],a:1,why:'Clients have a right to know their counselor\'s credential and supervision status, including who the supervisor is.'},
  {q:'A disclosure is legally required. How much information should you share?',o:['The full clinical record','Only the minimum necessary for the purpose','Whatever the requester asks for','Nothing without a second release'],a:1,why:'The minimum-necessary standard limits disclosures to what the specific purpose requires.'},
  {q:'Which situation is best described as a boundary crossing rather than a violation?',o:['Borrowing money from a client','A romantic relationship with a former client one month after termination','Accepting a small handmade card at termination','Hiring a current client to do work at your home'],a:2,why:'A small, symbolic gift at termination can be acceptable when considered thoughtfully. The others exploit or risk exploiting the relationship.'},
  {q:'After resolving a boundary concern, what best supports good practice?',o:['Delete any messages involved','Document the facts and your reasoning, and consult as needed','Tell other clients what happened as a teaching moment','Refer the client out right away'],a:1,why:'Documentation and consultation show sound reasoning and support continuity of care.'}],
 reflection:'Describe a boundary situation you have faced or expect to face in your setting. <b>Keep it de-identified.</b> Which ethical principles were in tension, what options did you consider, and who would you consult?'},

/* ---------------- MODULE 2 ---------------- */
{id:'m2',courseId:'c1',num:2,title:'Clinical Documentation',category:'Daily practice',minutes:120,prereq:null,
 summary:'Write clear, objective, timely notes using SOAP or DAP structure while protecting client privacy.',
 objectives:['Explain the clinical, legal, and continuity purposes of documentation','Separate observations, client report, and clinical interpretation','Write progress notes in SOAP and DAP formats','Apply privacy and minimum-necessary principles to records','Avoid common documentation pitfalls such as cloned and late notes'],
 lessons:[
  {type:'text',title:'Why we document',html:`
   <p>Notes do three jobs. They support <b>continuity of care</b>, so the next clinician (or you, six months from now) can understand what happened. They show <b>clinical reasoning</b> by linking interventions to the treatment plan. And they are a <b>legal and professional record</b> that supervisors, auditors, payers, and sometimes courts may read.</p>
   <div class="keypoint">Write every note as if your client will read it someday. Many will have the right to.</div>
   <p>Good notes are <b>accurate, timely, relevant, and concise</b>. They record what’s needed and leave out what isn’t. Gossip, speculation, and unnecessary third-party details don’t belong in them.</p>`},
  {type:'sort',title:'Exercise: Observation, report, or interpretation?',intro:'Sort each statement. Objective observations and client reports belong in notes. Unsupported interpretations should be rewritten.',
   buckets:['Objective observation','Client report (subjective)','Unsupported interpretation: rewrite'],
   items:[
    {t:'Client arrived 15 minutes late and sat near the door.',b:0},
    {t:'Client stated, "I haven\'t slept more than four hours a night this week."',b:1},
    {t:'Client was being manipulative.',b:2},
    {t:'PHQ-9 score of 14, up from 9 at intake.',b:0},
    {t:'Client described feeling "on edge all the time" at work.',b:1},
    {t:'Client seems lazy about homework.',b:2},
    {t:'Client was tearful when discussing a parent\'s illness.',b:0}]},
  {type:'text',title:'SOAP and DAP formats',html:`
   <p><b>SOAP</b>: <i>Subjective</i> (the client’s report), <i>Objective</i> (observations and measures), <i>Assessment</i> (your clinical impression and progress toward goals), <i>Plan</i> (next steps).</p>
   <p><b>DAP</b>: <i>Data</i> (subjective and objective together), <i>Assessment</i>, <i>Plan</i>. It’s more compact and common in outpatient settings.</p>
   <div class="keypoint"><b>Fictional example (DAP).</b><br><b>D:</b> Client reported increased conflict with supervisor and 3 panic episodes this week. Appeared restless; GAD-7 = 13 (prior 15). Practiced paced breathing in session.<br><b>A:</b> Modest symptom reduction; skills use emerging but inconsistent under work stress. Progressing toward Goal 1.<br><b>P:</b> Assigned daily breathing log; will introduce cognitive restructuring next session; reassess GAD-7 in 2 weeks.</div>`},
  {type:'rewrite',title:'Exercise: Rewrite a weak note',prompt:'Rewrite this note so it’s objective, linked to treatment goals, and useful to another clinician. Then compare yours with the model.',
   poor:'Client was in a bad mood again and kind of difficult. We talked about stuff going on at home. She is obviously codependent. Will continue.',
   model:'D: Client reported ongoing arguments with her partner about finances (3 this week) and said she feels "worn down." Affect constricted; minimal eye contact early in session, improving by the end. Reviewed the conflict log assigned last session (completed 4 of 7 days).\nA: Stressors persist; client is engaging with between-session work. Partial progress toward Goal 2 (identify and communicate needs).\nP: Role-play an assertive request next session; continue the conflict log; discuss a couples referral option as requested by client.'},
  {type:'text',title:'Records, privacy & timeliness',html:`
   <ul><li><b>Write notes promptly</b>, ideally the same day, and always according to your agency policy. Late entries should be labeled as late, with the date written.</li>
   <li><b>Never clone notes.</b> Copy-pasting prior content misrepresents what happened in the session.</li>
   <li><b>Corrections</b> are made by addendum. Don’t delete or overwrite.</li>
   <li><b>Minimum necessary:</b> share only what the purpose requires, and only with authorization or legal basis.</li>
   <li><b>Retention:</b> follow your board’s rules, applicable law, and agency policy for how long records are kept. Verify the current requirement rather than relying on memory.</li>
   <li><b>Client access:</b> clients generally have rights to access their records, so know your setting’s process.</li></ul>`},
  {type:'worksheet',title:'Worksheet: Progress note checklist',fileName:'Progress-Note-Checklist',intro:'A quick self-audit for any note before you sign it.',
   sections:[{h:'Content',p:['Linked to a treatment-plan goal?','Interventions named?','Client response described?','Risk addressed if relevant?']},{h:'Language',p:['Observations separated from interpretations?','Quotes used for key client statements?','Free of jargon, judgments, and unneeded third-party details?']},{h:'Compliance',p:['Written within policy timeframe?','Signed with correct credential (e.g., LPC Associate, supervised by ___)?','Late entry labeled if applicable?']}]}
 ],
 scenario:{title:'Friday at 5:45 p.m.',client:'Records',setup:'It\'s Friday evening. You have three unwritten notes from this week, your supervisor has asked for one of them by Monday for a chart review, and a colleague is waiting by the door.',
  start:'a',nodes:{
   a:{lines:[{w:'narr',t:'You open your documentation queue. You remember the sessions reasonably well, but the details are fading.'}],
    choices:[
     {t:'Copy last week\'s note for each client and update the date.',q:'poor',fb:'Cloned notes misrepresent care and are a serious documentation and billing integrity problem.',next:'b'},
     {t:'Write the notes now from your session jottings, recording only what you can accurately recall.',q:'good',fb:'Good. Writing promptly, and only what’s accurate, protects the record\'s integrity.',next:'b'},
     {t:'Wait until Monday morning to write all three.',q:'mixed',fb:'Possibly within policy, but accuracy drops with time. If you write them later, label them as late entries.',next:'b'}]},
   b:{lines:[{w:'narr',t:'Your colleague leans in.'},{w:'client',t:'"Hey, you see Mr. R., right? He\'s my neighbor\'s brother. Is he doing okay?"'}],
    choices:[
     {t:'"I can\'t confirm or discuss who I see. Have a good weekend!"',q:'good',fb:'Exactly right. You can’t even confirm that someone is a client without a legitimate need to know or authorization.',next:'c'},
     {t:'"He\'s doing a little better, but keep that between us."',q:'poor',fb:'This is a confidentiality breach, however well-intended.',next:'c'},
     {t:'Change the subject without answering.',q:'mixed',fb:'You avoided disclosing, but a brief, clear statement reinforces the norm for everyone.',next:'c'}]},
   c:{lines:[{w:'narr',t:'On Monday, a different client asks for a copy of their records.'}],
    choices:[
     {t:'Follow the agency\'s records-request procedure and tell your supervisor.',q:'good',fb:'Correct. Records requests follow a defined process, and your supervisor should know.',next:null},
     {t:'Edit your old notes first so they sound kinder, then print them.',q:'poor',fb:'Altering records is never acceptable. Corrections are made only by dated addendum.',next:null}]}
  }},
 quiz:[
  {q:'Which statement is the most objective?',o:['Client was hostile.','Client raised voice and left the session 10 minutes early.','Client clearly hates authority.','Client was in a mood.'],a:1,why:'It describes observable behavior without imputing motive.'},
  {q:'In SOAP notes, where does a PHQ-9 score belong?',o:['Subjective','Objective','Assessment','Plan'],a:1,why:'Standardized measure scores are objective data. Your interpretation of them goes in Assessment.'},
  {q:'You discover an error in a signed note from last week. What should you do?',o:['Delete it and rewrite it','Add a dated addendum correcting the error','Leave it, since it\'s already signed','Ask the client what they remember'],a:1,why:'Corrections are made by dated addendum, preserving the original entry.'},
  {q:'What is "note cloning"?',o:['Saving a backup copy of notes','Copying prior note content as if it were new documentation','Writing notes in group sessions','Using a template'],a:1,why:'Cloning presents copied content as new, which misrepresents what happened in the session.'},
  {q:'A colleague without a treatment role asks whether a person is your client. You should:',o:['Confirm but share nothing else','Neither confirm nor deny','Share only the diagnosis','Ask the client next session if it\'s okay'],a:1,why:'Even confirming that someone is a client is a disclosure.'}],
 reflection:'Pick one documentation habit you want to strengthen. What gets in the way of it now, and what specific change will you try for the next two weeks? <b>Don\'t include identifying client details.</b>'},

/* ---------------- MODULE 3 ---------------- */
{id:'m3',courseId:'c1',num:3,title:'Supervision & Consultation',category:'Professional development',minutes:120,prereq:null,
 summary:'Prepare focused case presentations, use feedback non-defensively, and follow through on recommendations.',
 objectives:['Describe the purpose and structure of clinical supervision for LPC Associates','Prepare a de-identified, focused case presentation','Use a simple case formulation framework (5 Ps)','Receive and integrate feedback non-defensively','Distinguish consultation from supervision'],
 lessons:[
  {type:'text',title:'What supervision is for',html:`
   <p>Clinical supervision protects clients, supports your development, and serves a gatekeeping function for the profession. In Texas, LPC Associates practice under a Council-approved LPC Supervisor (LPC-S), and board rules set minimums for supervision frequency and record-keeping. Your supervisor holds real responsibility for your work.</p>
   <div class="keypoint">Supervision works best when you set the agenda. Bring questions, not just updates.</div>
   <p>Supervision differs from <b>consultation</b>. Consultation is a voluntary, collegial exchange in which the consultant usually holds no evaluative authority or responsibility for the case.</p>`},
  {type:'sequence',title:'Exercise: Build a case presentation',intro:'Put these elements of a focused case presentation in a logical order. Use the arrows to move items.',
   items:['Your specific question for supervision','De-identified background (age range, setting, presenting concern)','Relevant history and current functioning','Your working formulation','What you\'ve tried and how the client responded','What you\'re unsure about'],
   order:[0,1,2,3,4,5],explain:'Leading with your question focuses everyone\u2019s listening. Then give just enough background, history and formulation to answer it, followed by what you\u2019ve tried and where you\u2019re stuck.'},
  {type:'text',title:'Case formulation with the 5 Ps',html:`
   <ul><li><b>Presenting:</b> what brings the client in now</li>
   <li><b>Predisposing:</b> longer-standing vulnerabilities (biological, psychological, social)</li>
   <li><b>Precipitating:</b> recent triggers</li>
   <li><b>Perpetuating:</b> what keeps the problem going</li>
   <li><b>Protective:</b> strengths and supports to build on</li></ul>
   <div class="keypoint">A formulation is a <i>hypothesis</i>. Bring it to supervision so it can be tested, not defended.</div>`},
  {type:'video',title:'Receiving feedback without getting defensive',duration:'6 min',html:`
   <p><b>Video summary.</b> Defensiveness is normal. Supervision touches your sense of competence. Try this sequence:</p>
   <ol><li><b>Pause</b> before responding.</li><li><b>Paraphrase</b> what you heard: "So you’re noticing I tend to rescue when she gets tearful?"</li>
   <li><b>Get curious</b>: "What did you see that made you think that?"</li><li><b>Commit to one experiment</b> for next session.</li><li><b>Report back</b> next supervision.</li></ol>`},
  {type:'worksheet',title:'Worksheet: Supervision prep sheet',fileName:'Supervision-Prep-Sheet',intro:'Fill this in before each supervision meeting.',
   sections:[{h:'Agenda',p:['Top question for today:','Cases to discuss (de-identified initials or codes only):']},{h:'Risk & ethics check',p:['Any safety concerns this week?','Any ethical or boundary questions?']},{h:'Follow-up',p:['Recommendations from last meeting:','What I tried and what happened:']},{h:'Development',p:['A skill I want feedback on:']}]}
 ],
 scenario:{title:'Hard feedback',client:'Supervisor',setup:'In supervision you present a client you\'ve seen for six weeks. Your supervisor (fictional) watched a segment of a recorded session, with the client\'s consent.',
  start:'a',nodes:{
   a:{lines:[{w:'client',t:'"I noticed that whenever she gets tearful, you jump in with reassurance or a solution. I wonder whether that\'s getting in the way of her sitting with the feeling."'}],
    choices:[
     {t:'"I don\'t think that\'s fair. She needs support right now."',q:'poor',fb:'This is a defensive reaction. It closes off the feedback before you’ve had a chance to explore it.',next:'b'},
     {t:'"Hm, I hadn\'t noticed. What did you see that made you think that?"',q:'good',fb:'Curiosity keeps the learning open and invites specifics.',next:'b'},
     {t:'"You\'re right, I\'ll stop doing that."',q:'mixed',fb:'You’re agreeable, but you skip the understanding part. Quick agreement can mask confusion.',next:'b'}]},
   b:{lines:[{w:'client',t:'"What could you try next session?"'}],
    choices:[
     {t:'Agree on one specific experiment: when she becomes tearful, pause and reflect the feeling before offering anything else. Then report back next week.',q:'good',fb:'Specific, observable, and testable. You’ll both know whether it helped.',next:'c'},
     {t:'"I\'ll try to be more aware of it."',q:'mixed',fb:'It’s well-meant but vague. Make it specific enough that you’ll know whether you did it.',next:'c'}]},
   c:{lines:[{w:'narr',t:'Next supervision meeting.'}],
    choices:[
     {t:'Open by reporting what happened when you tried the experiment, including what felt awkward.',q:'good',fb:'Excellent. Closing the loop is what turns feedback into growth.',next:null},
     {t:'Start with a new case and hope it doesn\'t come up.',q:'poor',fb:'Avoiding follow-up wastes the learning opportunity and can erode trust.',next:null}]}
  }},
 quiz:[
  {q:'In Texas, who supervises an LPC Associate\'s clinical experience?',o:['Any licensed mental health professional','A Council-approved LPC Supervisor (LPC-S)','The associate\'s graduate professor','A peer consultation group'],a:1,why:'LPC Associates must practice under a Council-approved LPC-S.'},
  {q:'How does consultation usually differ from supervision?',o:['Consultation always carries legal responsibility for the case','Consultation is collegial, and the consultant usually holds no evaluative authority over the case','Consultation is only for licensed supervisors','They are identical'],a:1,why:'Supervisors carry evaluative and oversight responsibility; consultants typically do not.'},
  {q:'Which of the 5 Ps describes what keeps a problem going?',o:['Predisposing','Precipitating','Perpetuating','Protective'],a:2,why:'Perpetuating factors maintain the problem over time.'},
  {q:'What makes a supervision question most productive?',o:['"Did I do okay?"','"What alternative responses could I try when the client shuts down after talking about work?"','"Can we skip this case?"','"Can you just tell me the diagnosis?"'],a:1,why:'Specific, behavior-focused questions lead to usable guidance.'},
  {q:'What is the best way to present case information in supervision?',o:['Full name and date of birth for accuracy','De-identified, with only the details relevant to the question','No details at all','Whatever the client posted publicly'],a:1,why:'Share what\'s needed for the question while minimizing identifying information.'}],
 reflection:'Think about a recent piece of feedback (from supervision, school, or work). What was your first internal reaction, what did you do with the feedback, and what would you do differently now?'},

/* ---------------- MODULE 4 ---------------- */
{id:'m4',courseId:'c1',num:4,title:'Assessment & Treatment Planning',category:'Clinical foundations',minutes:120,prereq:null,
 summary:'Turn intake information into collaborative, measurable goals and revise plans using progress data.',
 objectives:['Conduct a comprehensive biopsychosocial intake','Write collaborative, measurable treatment goals and objectives','Select interventions based on evidence, client preference, and competence','Use measurement-based care to monitor progress','Revise treatment plans when progress stalls'],
 lessons:[
  {type:'text',title:'The intake as a foundation',html:`
   <p>A biopsychosocial assessment gathers the presenting concern, history, current functioning, health, substance use, relationships, culture and identity, strengths, and safety. Its job is to generate <b>hypotheses</b>, not to confirm the first one you form.</p>
   <div class="keypoint">Ask what the client hopes will be different. Their answer is the seed of every goal.</div>
   <p>Use standardized measures as your setting allows (for example, the PHQ-9 for depressive symptoms or the GAD-7 for anxiety) to establish a baseline you can track over time.</p>`},
  {type:'sort',title:'Exercise: Is this objective measurable?',intro:'Sort each draft treatment objective.',
   buckets:['Measurable & specific','Too vague: rewrite'],
   items:[
    {t:'Client will feel better.',b:1},
    {t:'Client will use a grounding skill in at least 3 of 4 reported panic episodes within 6 weeks.',b:0},
    {t:'Client will improve self-esteem.',b:1},
    {t:'Client will reduce PHQ-9 score from 16 to below 10 within 12 weeks.',b:0},
    {t:'Client will attend weekly sessions and complete a daily mood log 5 days per week.',b:0},
    {t:'Client will work on relationship issues.',b:1}]},
  {type:'text',title:'Collaborative goals & choosing interventions',html:`
   <p>Goals belong to the client. Use the client’s own words for the broad goal, then build <b>SMART</b> objectives (specific, measurable, achievable, relevant, time-bound) together.</p>
   <p>When selecting interventions, weigh three things together: the <b>research evidence</b> for this concern, the <b>client’s preferences and culture</b>, and your <b>own competence</b>. Where you’re outside your training, that’s a supervision and referral conversation.</p>`},
  {type:'video',title:'Measurement-based care in practice',duration:'7 min',html:`
   <p><b>Video summary.</b> Routinely collecting brief measures and <i>reviewing them with the client</i> helps you catch stalled progress early. Practical tips:</p>
   <ul><li>Pick one or two measures that match the goals.</li><li>Administer them on a consistent schedule.</li><li>Graph the scores, and show the client.</li><li>Treat a plateau as information, not failure.</li></ul>`},
  {type:'worksheet',title:'Worksheet: Treatment plan builder',fileName:'Treatment-Plan-Builder',intro:'A simple structure for drafting a plan with a client.',
   sections:[{h:'Problem (client\'s words)',p:['']},{h:'Goal',p:['Broad goal:']},{h:'Objectives (SMART)',p:['1.','2.','3.']},{h:'Interventions',p:['Intervention / rationale:']},{h:'Measures & review',p:['Measure:','Review date:']}]}
 ],
 scenario:{title:'Too many priorities',client:'Ana',setup:'Ana (fictional, age 41) arrives at intake describing work stress, poor sleep, and conflict with her teenage son. She says, "I just need everything to calm down."',
  start:'a',nodes:{
   a:{lines:[{w:'client',t:'"Honestly, it\'s all of it. I don\'t even know where to start."'}],
    choices:[
     {t:'Ask what would make the biggest difference to her day-to-day life if it improved first.',q:'good',fb:'Good. Letting Ana prioritize builds collaboration and motivation.',next:'b'},
     {t:'Tell her to start with sleep, because that\'s usually the root cause.',q:'mixed',fb:'Sleep may matter a lot, but deciding for her undercuts collaboration. Offer it as an option instead.',next:'b'},
     {t:'Write goals for all three areas on her behalf so nothing is missed.',q:'poor',fb:'A plan she didn’t help build is unlikely to be one she follows.',next:'b'}]},
   b:{lines:[{w:'narr',t:'You agree on sleep and work stress first, with PHQ-9 and a sleep diary as measures. Six weeks later, the scores haven\'t moved.'},{w:'client',t:'"I\'m doing the exercises, mostly. I don\'t know why it isn\'t working."'}],
    choices:[
     {t:'Review the data together, explore barriers, and revise the plan (for example, adjust the intervention or consider a medical referral for sleep). Bring it to supervision.',q:'good',fb:'Excellent. Plateaus prompt a collaborative review rather than more of the same.',next:'c'},
     {t:'Keep going with the same plan. Change takes time.',q:'mixed',fb:'Sometimes patience is right, but six flat weeks call for at least a structured review.',next:'c'},
     {t:'Tell Ana she probably isn\'t trying hard enough.',q:'poor',fb:'Blaming the client damages the alliance and overlooks real barriers.',next:'c'}]},
   c:{lines:[{w:'narr',t:'You update the plan.'}],
    choices:[
     {t:'Document the revision, the rationale, and a new review date, and make sure Ana has a copy of the updated goals.',q:'good',fb:'The plan stays a living, shared document.',next:null},
     {t:'Make the change informally and update the paperwork at the annual review.',q:'poor',fb:'Plan revisions should be documented when they happen.',next:null}]}
  }},
 quiz:[
  {q:'Which objective is best written?',o:['Client will be less anxious.','Client will practice paced breathing daily and report a 2-point drop on the GAD-7 within 8 weeks.','Client will work on anxiety.','Client will try harder.'],a:1,why:'It\'s specific, measurable, and time-bound.'},
  {q:'What is the primary purpose of a biopsychosocial intake?',o:['To confirm the first diagnosis you suspect','To gather a broad picture and generate hypotheses','To satisfy billing only','To decide whether to refer'],a:1,why:'A broad assessment informs hypotheses and planning.'},
  {q:'Evidence-based practice integrates research evidence with:',o:['Only the counselor\'s favorite approach','Client characteristics and preferences, and clinician expertise','Insurance requirements only','Whatever the last workshop taught'],a:1,why:'All three components inform the choice of intervention.'},
  {q:'Progress has been flat for several weeks. The best first step is to:',o:['Terminate services','Review the data with the client and explore barriers','Ignore the measures','Add three new goals'],a:1,why:'A collaborative review identifies what needs to change.'},
  {q:'Who should be involved in setting treatment goals?',o:['The counselor alone','The client and counselor together','Only the supervisor','The insurance company'],a:1,why:'Collaborative goal-setting improves engagement and outcomes.'}],
 reflection:'Describe how you currently invite clients into goal-setting (or how you plan to). What is one way you could make progress data more visible and meaningful to clients?'},

/* ---------------- MODULE 5 ---------------- */
{id:'m5',courseId:'c1',num:5,title:'Risk Assessment & Referrals',category:'Client safety',minutes:120,prereq:'m1',
 summary:'Recognize safety concerns, use your setting\'s procedures, consult promptly, and plan referrals that preserve continuity of care.',
 objectives:['Recognize warning signs and risk and protective factors','Follow your setting\'s screening and consultation procedures','Describe collaborative safety planning at a conceptual level','Make referral decisions based on level of care and fit','Maintain continuity of care through transitions'],
 lessons:[
  {type:'text',title:'Recognizing safety concerns',html:`
   <p>Risk assessment is a structured clinical process, not a single question. It combines what the client tells you, what you observe, history, and context, and it is always conducted within your setting’s procedures and your competence.</p>
   <p>Settings commonly use standardized screening tools (for example, the Columbia Suicide Severity Rating Scale) alongside clinical interview. Know which tools your setting uses and what happens after a positive screen.</p>
   <div class="keypoint"><b>Asking directly about suicidal thoughts does not increase risk.</b> It opens the door to help.</div>
   <p>If someone is in immediate danger, call 911. The 988 Suicide &amp; Crisis Lifeline (call or text 988) is available 24/7 in the U.S.</p>`},
  {type:'sort',title:'Exercise: Risk or protective factor?',intro:'Sort each item. Real assessment weighs these together. No single factor decides risk.',
   buckets:['Risk factor','Protective factor'],
   items:[
    {t:'Strong sense of responsibility to children or family',b:1},
    {t:'Recent job loss',b:0},
    {t:'History of a previous suicide attempt',b:0},
    {t:'Active engagement in treatment',b:1},
    {t:'Access to lethal means',b:0},
    {t:'Supportive friendships and community connection',b:1},
    {t:'Recent loss or major relationship rupture',b:0}]},
  {type:'text',title:'Consultation & safety planning',html:`
   <ul><li><b>Consult early.</b> LPC Associates should involve their supervisor according to the supervision agreement and setting policy, often the same day for elevated concerns.</li>
   <li><b>Safety planning</b> is collaborative. It typically identifies warning signs, internal coping strategies, people and places for distraction, people to ask for help, professional and crisis contacts, and steps to make the environment safer (for example, reducing access to lethal means).</li>
   <li><b>Document</b> what you assessed, your clinical reasoning, the consultation, and the plan.</li></ul>
   <div class="keypoint">Never promise confidentiality you can’t keep. Clients should know the limits from intake onward.</div>`},
  {type:'video',title:'Referrals and continuity of care',duration:'7 min',html:`
   <p><b>Video summary.</b> Referral decisions consider level of care (outpatient, intensive outpatient, partial hospitalization, inpatient), specialty fit, access, cost, and client preference.</p>
   <ul><li>Use <b>warm handoffs</b> when possible, with client authorization.</li><li>Don’t end services abruptly. That risks abandonment.</li><li>Follow up to confirm the connection happened.</li><li>Document each step.</li></ul>`},
  {type:'worksheet',title:'Worksheet: Referral & continuity checklist',fileName:'Referral-Continuity-Checklist',intro:'Use it alongside, never in place of, your setting\'s procedures.',
   sections:[{h:'Need',p:['Reason for referral:','Level of care indicated:']},{h:'Fit & access',p:['Provider/program:','Insurance/cost:','Client preference discussed?']},{h:'Handoff',p:['Release signed?','Warm handoff completed?','Records sent (minimum necessary)?']},{h:'Follow-up',p:['Date connection confirmed:','Supervisor informed:']}]}
 ],
 scenario:{title:'"Better off without me"',client:'Marcus',setup:'Marcus (fictional, age 52) has been in counseling for depression after a layoff. Near the end of a session, he says something that shifts the conversation.',
  start:'a',nodes:{
   a:{lines:[{w:'client',t:'"Sometimes I think my family would be better off without me."'}],
    choices:[
     {t:'Note it and return to the planned topic. You\'re almost out of time.',q:'poor',fb:'A statement like this calls for a direct follow-up, even if the session runs over.',next:'b'},
     {t:'Ask directly and calmly whether he\'s having thoughts of suicide, then follow your setting\'s screening procedure.',q:'good',fb:'Correct. Asking directly is supportive, and it is the start of a structured assessment.',next:'b'},
     {t:'Call 911 immediately without asking anything further.',q:'mixed',fb:'If danger is imminent, emergency services are right. Here you don\'t yet know the level of risk. Assess first, within your procedures.',next:'b'}]},
   b:{lines:[{w:'client',t:'"I\'ve thought about not waking up. I don\'t have a plan. I wouldn\'t do that to my daughter."'},{w:'narr',t:'Your screening and interview suggest passive ideation with no plan or intent, along with meaningful protective factors.'}],
    choices:[
     {t:'Build a collaborative safety plan with him, consult your supervisor the same day, and document your assessment and reasoning.',q:'good',fb:'Excellent. Collaborative planning, prompt consultation, and documentation are all in place.',next:'c'},
     {t:'Promise you won\'t tell anyone so he keeps trusting you.',q:'poor',fb:'Never promise confidentiality you may not be able to keep. Return to the limits you discussed at intake.',next:'c'},
     {t:'Tell him he needs a higher level of care and end your services today.',q:'poor',fb:'Ending services abruptly risks abandonment. If a referral is needed, it should be planned, with continuity.',next:'c'}]},
   c:{lines:[{w:'narr',t:'Your supervisor agrees with the plan and recommends adding a psychiatric evaluation referral.'}],
    choices:[
     {t:'Discuss the referral with Marcus, get his authorization, make a warm handoff, keep seeing him, and confirm the connection at the next session.',q:'good',fb:'This is good continuity of care. The referral adds support rather than replacing you.',next:null},
     {t:'Give him a phone number and leave the rest to him.',q:'mixed',fb:'It’s better than nothing, but a warm handoff and follow-up make the connection much more likely.',next:null}]}
  }},
 quiz:[
  {q:'Asking a client directly about suicidal thoughts:',o:['Increases risk by planting the idea','Does not increase risk and opens the door to help','Should be avoided with new clients','Is only for psychiatrists'],a:1,why:'Research and practice guidance support asking directly.'},
  {q:'Which is a protective factor?',o:['Recent job loss','Access to lethal means','Strong connection to family','Previous attempt'],a:2,why:'Connectedness and a sense of responsibility to others are protective.'},
  {q:'An LPC Associate identifies elevated risk. A key step is to:',o:['Handle it alone to show competence','Consult the supervisor according to the supervision agreement and setting policy','Wait for the next supervision meeting next month','Post about it in a professional forum'],a:1,why:'Prompt consultation is essential, and associates practice under supervision.'},
  {q:'What does a "warm handoff" mean?',o:['Faxing records with no contact','A direct, authorized introduction to the new provider, with follow-up','Ending services kindly','Recommending a website'],a:1,why:'Warm handoffs increase the chance of a successful connection.'},
  {q:'What number reaches the 988 Suicide & Crisis Lifeline?',o:['311','411','988','211'],a:2,why:'Call or text 988, available 24/7 in the U.S.'}],
 reflection:'What does your setting\'s procedure look like when a client discloses safety concerns? (If you don\'t know yet, write down what you need to ask your supervisor.) What feels most uncertain to you about this part of practice?'}
];

/* Draft course for curriculum-management demo */
const SEED_DRAFT_MODULES=[
 {id:'m6',courseId:'c2',num:1,title:'Telehealth Readiness',category:'Telehealth',minutes:60,prereq:null,summary:'Setting up a private, accessible telehealth practice.',objectives:['Assess client suitability for telehealth','Address privacy and emergency planning for remote sessions'],
  lessons:[{type:'text',title:'Is telehealth a fit?',html:'<p>Draft lesson. Consider client preference, technology access, privacy at the client\'s location, and emergency planning for the client\'s physical location.</p>'},{type:'video',title:'Platform walkthrough',duration:'TBD',html:'<p>Video not yet uploaded.</p>'}],
  scenario:null,quiz:[{q:'Before a telehealth session begins, you should confirm:',o:['The client\'s favorite color','The client\'s current physical location','The weather','Nothing extra'],a:1,why:'Location matters for emergency planning and jurisdiction.'}],reflection:'What concerns do you have about providing telehealth?'},
 {id:'m7',courseId:'c2',num:2,title:'Emergency Planning for Remote Sessions',category:'Telehealth',minutes:60,prereq:'m6',summary:'Draft module: local emergency resources and contingency plans.',objectives:['Create a remote-session emergency plan'],lessons:[{type:'text',title:'Building the plan',html:'<p>Draft content goes here.</p>'}],scenario:null,quiz:[],reflection:'Draft reflection prompt.'}
];
