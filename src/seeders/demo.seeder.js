/**
 * Demo Data Seeder
 * Populates realistic government recruitment jobs, time slots, agents, applicants, and notifications.
 */
const { connectDatabase } = require('../config/database.config');
const {
  syncDatabase,
  User,
  Profile,
  NotificationPreference,
  Job,
  Result,
  AdmitCard,
  TimeSlot,
  Application,
  AssistanceRequest,
  Payment,
  Membership,
  Feedback,
} = require('../models');
const { hashPassword } = require('../utils/password.util');
const { ROLES } = require('../constants/role.constant');
const { JOB_STATUSES, APPLICATION_STATUSES } = require('../constants/application.constant');
const { ASSISTANCE_STATUSES, TIME_SLOT_STATUSES } = require('../constants/assistance.constant');
const { MEMBERSHIP_STATUSES } = require('../constants/membership.constant');
const { addDays, addMonths } = require('../utils/date.util');

async function seedDemoData() {
  try {
    await connectDatabase();
    await syncDatabase();

    console.log('[Seed] Populating demo data...');

    // 1. Create Demo Agent
    const agentPassword = await hashPassword('Agent@12345');
    const [agent] = await User.findOrCreate({
      where: { email: 'agent1@recruitment.gov.in' },
      defaults: {
        email: 'agent1@recruitment.gov.in',
        passwordHash: agentPassword,
        role: ROLES.AGENT,
        status: 'ACTIVE',
      },
    });

    await Profile.findOrCreate({
      where: { userId: agent.id },
      defaults: {
        userId: agent.id,
        fullName: 'Rajesh Kumar (Senior Assistance Officer)',
        mobileNumber: '9876543210',
        state: 'Delhi',
        profileCompletionPercentage: 100,
      },
    });

    // 2. Create Demo Applicant
    const studentPassword = await hashPassword('Student@12345');
    const [student] = await User.findOrCreate({
      where: { email: 'student@example.com' },
      defaults: {
        email: 'student@example.com',
        passwordHash: studentPassword,
        role: ROLES.USER,
        status: 'ACTIVE',
      },
    });

    const [studentProfile] = await Profile.findOrCreate({
      where: { userId: student.id },
      defaults: {
        userId: student.id,
        fullName: 'Aman Sharma',
        dob: '1999-06-15',
        gender: 'MALE',
        mobileNumber: '9123456789',
        email: 'student@example.com',
        state: 'Uttar Pradesh',
        district: 'Lucknow',
        category: 'OBC',
        educationLevel: 'GRADUATE',
        degree: 'Bachelor of Science (B.Sc)',
        branch: 'Computer Science',
        passingYear: 2021,
        position: 'CANDIDATE',
        profileCompletionPercentage: 90,
      },
    });

    await NotificationPreference.findOrCreate({
      where: { userId: student.id },
      defaults: {
        userId: student.id,
        emailEnabled: true,
        telegramEnabled: false,
      },
    });

    // 3. Create Government Recruitment Opportunities
    const today = new Date();
    const lastDate1 = addDays(today, 30).toISOString().split('T')[0];
    const lastDate2 = addDays(today, 45).toISOString().split('T')[0];
    const lastDate3 = addDays(today, 15).toISOString().split('T')[0];
    const examDate1 = addDays(today, 60).toISOString().split('T')[0];
    const examDate2 = addDays(today, 90).toISOString().split('T')[0];

    const jobsData = [
      {
        title: 'Combined Graduate Level Examination (SSC CGL 2026)',
        organization: 'Staff Selection Commission (SSC)',
        department: 'Central Government Ministries & Departments',
        recruitmentType: 'All India General Recruitment',
        description: 'Recruitment for Group B and Group C posts in various Ministries/ Departments/ Organizations of the Government of India.',
        shortDescription: 'SSC CGL 2026 recruitment for 12,000+ vacancies across central departments.',
        officialNotificationUrl: 'https://ssc.gov.in/notice/cgl-2026',
        officialApplicationUrl: 'https://ssc.gov.in/apply/cgl-2026',
        applicationStartDate: today.toISOString().split('T')[0],
        applicationLastDate: lastDate1,
        examDate: examDate1,
        ageMin: 18,
        ageMax: 32,
        qualification: 'GRADUATE',
        degreeRequirements: 'Bachelor Degree in any discipline',
        vacancies: 12450,
        applicationFee: 100.0,
        state: 'All India',
        status: JOB_STATUSES.PUBLISHED,
        isFeatured: true,
        isPublished: true,
      },
      {
        title: 'Civil Services Examination (UPSC CSE 2026)',
        organization: 'Union Public Service Commission (UPSC)',
        department: 'IAS, IPS, IFS & Central Civil Services',
        recruitmentType: 'National Civil Services',
        description: 'Prestigious national recruitment examination for selection to Indian Administrative Service, Indian Police Service, and Allied Group A services.',
        shortDescription: 'UPSC Civil Services 2026 preliminary examination recruitment.',
        officialNotificationUrl: 'https://upsc.gov.in/notices/cse-2026',
        officialApplicationUrl: 'https://upsconline.nic.in',
        applicationStartDate: today.toISOString().split('T')[0],
        applicationLastDate: lastDate2,
        examDate: examDate2,
        ageMin: 21,
        ageMax: 32,
        qualification: 'GRADUATE',
        degreeRequirements: 'Graduation from any recognized university',
        vacancies: 1056,
        applicationFee: 100.0,
        state: 'All India',
        status: JOB_STATUSES.PUBLISHED,
        isFeatured: true,
        isPublished: true,
      },
      {
        title: 'Probationary Officers (IBPS PO/MT XIV)',
        organization: 'Institute of Banking Personnel Selection (IBPS)',
        department: 'Public Sector Banks',
        recruitmentType: 'Banking Recruitment',
        description: 'Recruitment of Probationary Officers / Management Trainees in participating public sector banks across India.',
        shortDescription: 'IBPS PO 2026 for 4,000+ vacancies in nationalized banks.',
        officialNotificationUrl: 'https://ibps.in/crp-po-xiv',
        officialApplicationUrl: 'https://ibps.in/apply',
        applicationStartDate: today.toISOString().split('T')[0],
        applicationLastDate: lastDate3,
        ageMin: 20,
        ageMax: 30,
        qualification: 'GRADUATE',
        vacancies: 4455,
        applicationFee: 175.0,
        state: 'All India',
        status: JOB_STATUSES.PUBLISHED,
        isFeatured: false,
        isPublished: true,
      },
    ];

    const createdJobs = [];
    for (const data of jobsData) {
      const [job] = await Job.findOrCreate({
        where: { title: data.title },
        defaults: data,
      });
      createdJobs.push(job);
    }

    const firstJob = createdJobs[0];

    // 4. Create Results & Admit Cards
    await Result.findOrCreate({
      where: { title: 'SSC CGL 2025 Tier-I Final Result & Cutoff' },
      defaults: {
        jobId: firstJob.id,
        title: 'SSC CGL 2025 Tier-I Final Result & Cutoff',
        organization: 'Staff Selection Commission (SSC)',
        resultType: 'Tier-I Written Examination',
        resultDate: addDays(today, -5).toISOString().split('T')[0],
        description: 'Cutoff marks and list of candidates shortlisted for Tier-II descriptive examination.',
        officialResultUrl: 'https://ssc.gov.in/results/cgl-2025-tier1',
        cutoffInfo: 'UR: 142.50, OBC: 138.25, EWS: 135.00, SC: 122.00, ST: 114.50',
        isPublished: true,
      },
    });

    await AdmitCard.findOrCreate({
      where: { title: 'SSC CGL 2026 Tier-I City Intimation & Admit Card' },
      defaults: {
        jobId: firstJob.id,
        title: 'SSC CGL 2026 Tier-I City Intimation & Admit Card',
        organization: 'Staff Selection Commission (SSC)',
        availabilityDate: addDays(today, 10).toISOString().split('T')[0],
        examDate: examDate1,
        officialAdmitCardUrl: 'https://ssc.gov.in/admit-card',
        instructions: 'Candidates must carry 2 passport photos and original Government Photo ID to the test centre.',
        isPublished: true,
      },
    });

    // 5. Create Available Time Slots for Next 7 Days
    for (let i = 1; i <= 5; i++) {
      const slotDate = addDays(today, i).toISOString().split('T')[0];
      const slotTimes = [
        { startTime: '10:00', endTime: '11:00' },
        { startTime: '14:00', endTime: '15:00' },
        { startTime: '17:00', endTime: '18:00' },
      ];

      for (const t of slotTimes) {
        await TimeSlot.findOrCreate({
          where: { date: slotDate, startTime: t.startTime },
          defaults: {
            date: slotDate,
            startTime: t.startTime,
            endTime: t.endTime,
            maxCapacity: 2,
            availableCapacity: 2,
            status: TIME_SLOT_STATUSES.AVAILABLE,
          },
        });
      }
    }

    // 6. Create Demo Time Slot & Assistance Request
    const slotDate = addDays(today, 2).toISOString().split('T')[0];
    const slot = await TimeSlot.findOne({ where: { date: slotDate, startTime: '10:00' } });

    if (slot && firstJob) {
      const [assistance] = await AssistanceRequest.findOrCreate({
        where: { userId: student.id, jobId: firstJob.id },
        defaults: {
          userId: student.id,
          jobId: firstJob.id,
          preferredSlotId: slot.id,
          assignedAgentId: agent.id,
          status: ASSISTANCE_STATUSES.ASSIGNED,
          serviceFee: 50.0,
          officialFee: firstJob.applicationFee,
          totalAmount: firstJob.applicationFee + 50.0,
          meetingLink: 'https://meet.google.com/abc-demo-xyz',
          scheduledAt: new Date(`${slot.date}T${slot.startTime}:00`),
        },
      });

      const [application] = await Application.findOrCreate({
        where: { userId: student.id, jobId: firstJob.id },
        defaults: {
          userId: student.id,
          jobId: firstJob.id,
          assistanceRequestId: assistance.id,
          assignedAgentId: agent.id,
          status: APPLICATION_STATUSES.SCHEDULED,
        },
      });

      assistance.applicationId = application.id;
      await assistance.save();

      await Payment.findOrCreate({
        where: { assistanceRequestId: assistance.id },
        defaults: {
          userId: student.id,
          applicationId: application.id,
          assistanceRequestId: assistance.id,
          paymentType: 'ASSISTANCE',
          officialFee: firstJob.applicationFee,
          serviceFee: 50.0,
          totalAmount: firstJob.applicationFee + 50.0,
          status: 'SUCCESS',
          paidAt: new Date(),
        },
      });
    }

    // 7. Create Demo Membership
    await Membership.findOrCreate({
      where: { userId: student.id, planId: 'QUARTERLY_99' },
      defaults: {
        userId: student.id,
        planId: 'QUARTERLY_99',
        planName: 'Quarterly Plan (3 Months)',
        amount: 99.0,
        startDate: today.toISOString().split('T')[0],
        endDate: addMonths(today, 3).toISOString().split('T')[0],
        status: MEMBERSHIP_STATUSES.ACTIVE,
      },
    });

    // 8. Create Demo Feedback
    await Feedback.findOrCreate({
      where: { userId: student.id, subject: 'Excellent Assistance Experience' },
      defaults: {
        userId: student.id,
        type: 'FEEDBACK',
        subject: 'Excellent Assistance Experience',
        message: 'The agent helped me fill my SSC form quickly and safely entered all details while I entered my own password and OTP during the meet.',
        rating: 5,
        status: 'RESOLVED',
        adminResponse: 'Thank you for your valuable feedback, Aman!',
      },
    });

    console.log('[Seed] Demo data seeding completed successfully!');
    console.log('----------------------------------------------------');
    console.log('  Agent Account    : agent1@recruitment.gov.in / Agent@12345');
    console.log('  Applicant Account: student@example.com / Student@12345');
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('[Seed] Demo seeding failed:', error);
    throw error;
  }
}

if (require.main === module) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedDemoData;
