
const API_BASE_URL = "http://localhost:8000/api";


async function apiRequest(endpoint, options = {}) {

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    }
  );


  if (!response.ok) {

    let errorMessage =
      `API request failed: ${response.status}`;


    try {

      const errorData =
        await response.json();

      if (errorData.detail) {
        errorMessage = errorData.detail;
      }

    } catch {
      // Ignore non-JSON error
    }


    throw new Error(errorMessage);
  }


  return response.json();
}


/* =========================================================
   RECONCILIATION SUMMARY
   ========================================================= */

export async function getReconciliationSummary() {

  const data =
    await apiRequest(
      "/meetings/summary/reconciliation"
    );

  console.log(
    "API returned summary:",
    data
  );

  return {

    total:
      Number(
        data.total_crm_records ?? 0
      ) +
      Number(
        data.total_calendar_records ?? 0
      ),

    matched:
      Number(
        data.matched_records ?? 0
      ),

    crm_only:
      Number(
        data.crm_only_records ?? 0
      ),

    calendar_only:
      Number(
        data.calendar_only_records ?? 0
      ),

    conflicts:
      Number(
        data.conflicts ?? 0
      ),

    // Keep original backend values too

    total_crm_records:
      Number(
        data.total_crm_records ?? 0
      ),

    total_calendar_records:
      Number(
        data.total_calendar_records ?? 0
      ),

    possible_duplicates:
      Number(
        data.possible_duplicates ?? 0
      ),

    validation_issues:
      Number(
        data.validation_issues ?? 0
      ),
  };
}


/* =========================================================
   HEALTH
   ========================================================= */

export async function getHealth() {

  return apiRequest(
    "/health"
  );

}


/* =========================================================
   ALL MEETINGS
   ========================================================= */

export async function getMeetings() {

  return apiRequest(
    "/meetings"
  );

}


/* =========================================================
   DUPLICATES
   ========================================================= */

export async function getDuplicates() {

  return apiRequest(
    "/meetings/duplicates"
  );

}


/* =========================================================
   MATCH STATUS
   ========================================================= */

export async function getMeetingsByStatus(
  matchStatus
) {

  if (!matchStatus) {

    return getMeetings();

  }


  return apiRequest(
    `/meetings?match_status=${encodeURIComponent(
      matchStatus
    )}`
  );

}


/* =========================================================
   CONFLICTS
   ========================================================= */

export async function getConflictMeetings() {

  return apiRequest(
    "/meetings?has_conflicts=true"
  );

}


/* =========================================================
   SINGLE MEETING
   ========================================================= */

export async function getMeetingById(
  meetingId
) {

  if (!meetingId) {

    throw new Error(
      "Meeting ID is required"
    );

  }


  return apiRequest(
    `/meetings/${encodeURIComponent(
      meetingId
    )}`
  );

}


/* =========================================================
   CONVENIENCE METHODS
   ========================================================= */

export async function getMatchedMeetings() {

  return getMeetingsByStatus(
    "MATCHED"
  );

}


export async function getCrmOnlyMeetings() {

  return getMeetingsByStatus(
    "CRM_ONLY"
  );

}


export async function getCalendarOnlyMeetings() {

  return getMeetingsByStatus(
    "CALENDAR_ONLY"
  );

}


/* =========================================================
   CONFIG
   ========================================================= */

export const API_CONFIG = {

  baseUrl:
    API_BASE_URL,

  healthUrl:
    `${API_BASE_URL}/health`,

  meetingsUrl:
    `${API_BASE_URL}/meetings`,

  duplicatesUrl:
    `${API_BASE_URL}/meetings/duplicates`,

  summaryUrl:
    `${API_BASE_URL}/meetings/summary/reconciliation`,

  swaggerUrl:
    "http://localhost:8000/docs",

};

