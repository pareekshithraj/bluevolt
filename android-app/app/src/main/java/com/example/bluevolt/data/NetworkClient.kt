package com.bluevolt.app.data

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.contentOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

object NetworkClient {
    const val BASE_URL = "https://bluevolt.group"
    private const val PREFS_NAME = "bluevolt_prefs"
    private const val KEY_TOKEN = "auth_token"
    private const val KEY_USER_NAME = "user_name"
    private const val KEY_USER_EMAIL = "user_email"
    private const val KEY_USER_ROLE = "user_role"

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
        .writeTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
        .build()
    private val json = Json { ignoreUnknownKeys = true }

    private fun getPrefs(context: Context) = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getToken(context: Context): String? = getPrefs(context).getString(KEY_TOKEN, null)
    fun getUserName(context: Context): String? = getPrefs(context).getString(KEY_USER_NAME, null)
    fun getUserEmail(context: Context): String? = getPrefs(context).getString(KEY_USER_EMAIL, null)
    fun getUserRole(context: Context): String? = getPrefs(context).getString(KEY_USER_ROLE, null)

    fun saveToken(context: Context, token: String, name: String, email: String, role: String) {
        getPrefs(context).edit()
            .putString(KEY_TOKEN, token)
            .putString(KEY_USER_NAME, name)
            .putString(KEY_USER_EMAIL, email)
            .putString(KEY_USER_ROLE, role)
            .apply()
    }

    fun clearToken(context: Context) {
        getPrefs(context).edit().clear().apply()
    }

    private fun getFriendlyError(e: Throwable): Exception {
        val msg = e.message ?: ""
        return when {
            msg.contains("timeout", ignoreCase = true) || msg.contains("time out", ignoreCase = true) -> 
                Exception("Network Timeout: Could not connect to BlueVolt servers. Please check your internet connection.")
            msg.contains("failed to connect", ignoreCase = true) || msg.contains("unreachable", ignoreCase = true) || msg.contains("connection refused", ignoreCase = true) || msg.contains("resolv", ignoreCase = true) -> 
                Exception("Connection Issue: BlueVolt servers are unreachable. Please check your internet connection.")
            else -> Exception("Network Error: ${e.localizedMessage ?: "Please try again later."}")
        }
    }

    suspend fun login(context: Context, emailStr: String, passwordStr: String): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val jsonBody = """{"email":"$emailStr","password":"$passwordStr"}"""
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/login")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    val jsonObj = json.parseToJsonElement(bodyStr) as JsonObject
                    var token = jsonObj["token"]?.jsonPrimitive?.contentOrNull
                    
                    // Fallback to Set-Cookie bluevolt_employee_session
                    if (token == null) {
                        val cookies = response.headers("Set-Cookie")
                        for (cookie in cookies) {
                            if (cookie.contains("bluevolt_employee_session")) {
                                token = cookie.substringAfter("bluevolt_employee_session=")
                                    .substringBefore(";")
                                    .trim()
                                break
                            }
                        }
                    }

                    val userObj = jsonObj["user"] as? JsonObject
                    val name = userObj?.get("name")?.jsonPrimitive?.contentOrNull ?: ""
                    val email = userObj?.get("email")?.jsonPrimitive?.contentOrNull ?: ""
                    val role = userObj?.get("role")?.jsonPrimitive?.contentOrNull ?: ""
                    
                    if (token != null) {
                        saveToken(context, token, name, email, role)
                        Result.success(true)
                    } else {
                        Result.failure(Exception("Invalid response format: Missing token"))
                    }
                } else {
                    val errorMsg = try {
                        val jsonObj = json.parseToJsonElement(bodyStr) as JsonObject
                        jsonObj["error"]?.jsonPrimitive?.contentOrNull ?: "Login failed"
                    } catch (e: Exception) {
                        "Login failed: ${response.code}"
                    }
                    Result.failure(Exception(errorMsg))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun fetchPortalData(context: Context, tab: String = "dashboard"): Result<String> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/portal?tab=$tab")
                .header("Authorization", "Bearer $token")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    // Update user name/email/role cache from portal data if session is available
                    try {
                        val jsonObj = json.parseToJsonElement(bodyStr) as? JsonObject
                        val sessionObj = jsonObj?.get("session") as? JsonObject
                        if (sessionObj != null) {
                            val name = sessionObj["name"]?.jsonPrimitive?.contentOrNull ?: ""
                            val email = sessionObj["email"]?.jsonPrimitive?.contentOrNull ?: ""
                            val role = sessionObj["role"]?.jsonPrimitive?.contentOrNull ?: ""
                            
                            // Save to shared preferences
                            getPrefs(context).edit()
                                .putString(KEY_USER_NAME, name)
                                .putString(KEY_USER_EMAIL, email)
                                .putString(KEY_USER_ROLE, role)
                                .apply()
                        }
                    } catch (e: Exception) {
                        // ignore parsing error for user profile
                    }
                    Result.success(bodyStr)
                } else {
                    Result.failure(Exception("Failed to fetch data: ${response.code}"))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun clockIn(context: Context): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val requestBody = "".toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/clock-in")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    Result.failure(Exception("Clock-in failed: ${response.code}"))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun clockOut(context: Context): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val requestBody = "".toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/clock-out")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    Result.failure(Exception("Clock-out failed: ${response.code}"))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun submitLeaveRequest(
        context: Context,
        leaveType: String,
        startsAt: String,
        endsAt: String,
        reason: String
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val jsonBody = """
                {
                    "leaveType": "$leaveType",
                    "startsAt": "$startsAt",
                    "endsAt": "$endsAt",
                    "reason": "$reason"
                }
            """.trimIndent()
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/leave-request")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    val errorMsg = try {
                        val jsonObj = json.parseToJsonElement(bodyStr) as JsonObject
                        jsonObj["error"]?.jsonPrimitive?.contentOrNull ?: "Failed to submit request"
                    } catch (e: Exception) {
                        "Failed to submit request: ${response.code}"
                    }
                    Result.failure(Exception(errorMsg))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun updateRecordStatus(
        context: Context,
        entityType: String,
        id: String,
        status: String
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val jsonBody = """
                {
                    "entityType": "$entityType",
                    "id": "$id",
                    "status": "$status"
                }
            """.trimIndent()
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/update-status")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    val errorMsg = try {
                        val jsonObj = json.parseToJsonElement(bodyStr) as JsonObject
                        jsonObj["error"]?.jsonPrimitive?.contentOrNull ?: "Failed to update record"
                    } catch (e: Exception) {
                        "Failed to update record: ${response.code}"
                    }
                    Result.failure(Exception(errorMsg))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun sendGroupChatMessage(context: Context, body: String): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val jsonBody = """
                {
                    "body": "${body.replace("\"", "\\\"").replace("\n", "\\n")}"
                }
            """.trimIndent()
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/chat")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    val errorMsg = try {
                        val jsonObj = json.parseToJsonElement(bodyStr) as JsonObject
                        jsonObj["error"]?.jsonPrimitive?.contentOrNull ?: "Failed to send message"
                    } catch (e: Exception) {
                        "Failed to send message: ${response.code}"
                    }
                    Result.failure(Exception(errorMsg))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun submitExpenseClaim(
        context: Context,
        category: String,
        amount: String,
        claimDate: String,
        notes: String
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val jsonBody = """
                {
                    "category": "$category",
                    "amount": "$amount",
                    "claimDate": "$claimDate",
                    "notes": "${notes.replace("\"", "\\\"").replace("\n", "\\n")}"
                }
            """.trimIndent()
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/expense")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    val errorMsg = try {
                        val jsonObj = json.parseToJsonElement(bodyStr) as JsonObject
                        jsonObj["error"]?.jsonPrimitive?.contentOrNull ?: "Failed to submit claim"
                    } catch (e: Exception) {
                        "Failed to submit claim: ${response.code}"
                    }
                    Result.failure(Exception(errorMsg))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    private const val KEY_PORTAL_CACHE_PREFIX = "portal_cache_"

    fun getCachedPortalData(context: Context, tab: String): String? {
        return getPrefs(context).getString(KEY_PORTAL_CACHE_PREFIX + tab, null)
    }

    fun saveCachedPortalData(context: Context, tab: String, dataStr: String) {
        getPrefs(context).edit().putString(KEY_PORTAL_CACHE_PREFIX + tab, dataStr).apply()
    }

    suspend fun markNotificationRead(context: Context, notificationId: String): Result<Boolean> =
        withContext(Dispatchers.IO) {
            try {
                val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
                val jsonBody = """{"entityType":"notification","id":"$notificationId","status":"read"}"""
                val request = Request.Builder()
                    .url("$BASE_URL/api/employee/update-status")
                    .header("Authorization", "Bearer $token")
                    .post(jsonBody.toRequestBody("application/json".toMediaType()))
                    .build()
                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) Result.success(true)
                    else Result.failure(Exception("Failed: ${response.code}"))
                }
            } catch (e: IOException) {
                Result.failure(getFriendlyError(e))
            }
        }

    suspend fun markAllNotificationsRead(context: Context): Result<Boolean> =
        withContext(Dispatchers.IO) {
            try {
                val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
                val jsonBody = """{"entityType":"allNotifications","id":"","status":"read"}"""
                val request = Request.Builder()
                    .url("$BASE_URL/api/employee/update-status")
                    .header("Authorization", "Bearer $token")
                    .post(jsonBody.toRequestBody("application/json".toMediaType()))
                    .build()
                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) Result.success(true)
                    else Result.failure(Exception("Failed: ${response.code}"))
                }
            } catch (e: IOException) {
                Result.failure(getFriendlyError(e))
            }
        }

    suspend fun fetchLetterHtml(context: Context, employeeId: String, letterType: String): Result<String> =
        withContext(Dispatchers.IO) {
            try {
                val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
                val encodedType = java.net.URLEncoder.encode(letterType, "UTF-8")
                val request = Request.Builder()
                    .url("$BASE_URL/api/employee/letter?employeeId=$employeeId&type=$encodedType")
                    .header("Authorization", "Bearer $token")
                    .get()
                    .build()
                client.newCall(request).execute().use { response ->
                    val bodyStr = response.body?.string() ?: ""
                    if (response.isSuccessful) Result.success(bodyStr)
                    else Result.failure(Exception(bodyStr.take(200).ifBlank { "Failed: ${response.code}" }))
                }
            } catch (e: IOException) {
                Result.failure(getFriendlyError(e))
            }
        }

    suspend fun fetchIdCardHtml(context: Context, employeeId: String): Result<String> =
        withContext(Dispatchers.IO) {
            try {
                val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
                val request = Request.Builder()
                    .url("$BASE_URL/api/employee/id-card?employeeId=$employeeId")
                    .header("Authorization", "Bearer $token")
                    .get()
                    .build()
                client.newCall(request).execute().use { response ->
                    val bodyStr = response.body?.string() ?: ""
                    if (response.isSuccessful) Result.success(bodyStr)
                    else Result.failure(Exception(bodyStr.take(200).ifBlank { "Failed: ${response.code}" }))
                }
            } catch (e: IOException) {
                Result.failure(getFriendlyError(e))
            }
        }

    suspend fun saveMeeting(
        context: Context,
        id: String?,
        title: String,
        startsAt: String,
        endsAt: String,
        meetUrl: String,
        audienceRoles: String,
        audienceUsers: String,
        notes: String
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val idJson = if (id != null) "\"id\": \"$id\"," else ""
            val jsonBody = """
                {
                    "operation": "saveMeeting",
                    "payload": {
                        $idJson
                        "title": "${title.replace("\"", "\\\"")}",
                        "startsAt": "$startsAt",
                        "endsAt": "$endsAt",
                        "meetUrl": "$meetUrl",
                        "audienceRoles": "$audienceRoles",
                        "audienceUsers": "$audienceUsers",
                        "notes": "${notes.replace("\"", "\\\"")}"
                    }
                }
            """.trimIndent()
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/operation")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    val errorMsg = try {
                        val jsonObj = json.parseToJsonElement(bodyStr) as JsonObject
                        jsonObj["error"]?.jsonPrimitive?.contentOrNull ?: "Failed to save meeting"
                    } catch (e: Exception) {
                        "Failed to save meeting: ${response.code}"
                    }
                    Result.failure(Exception(errorMsg))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun saveResource(
        context: Context,
        id: String?,
        title: String,
        resourceType: String,
        url: String,
        description: String,
        audienceRoles: String,
        audienceUsers: String,
        tags: String
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val idJson = if (id != null) "\"id\": \"$id\"," else ""
            val jsonBody = """
                {
                    "operation": "saveResource",
                    "payload": {
                        $idJson
                        "title": "${title.replace("\"", "\\\"")}",
                        "resourceType": "$resourceType",
                        "url": "$url",
                        "description": "${description.replace("\"", "\\\"")}",
                        "audienceRoles": "$audienceRoles",
                        "audienceUsers": "$audienceUsers",
                        "tags": "$tags"
                    }
                }
            """.trimIndent()
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/operation")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    val errorMsg = try {
                        val jsonObj = json.parseToJsonElement(bodyStr) as JsonObject
                        jsonObj["error"]?.jsonPrimitive?.contentOrNull ?: "Failed to save resource"
                    } catch (e: Exception) {
                        "Failed to save resource: ${response.code}"
                    }
                    Result.failure(Exception(errorMsg))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun saveRoleDefinition(
        context: Context,
        key: String,
        label: String,
        description: String,
        permissions: String,
        dashboardType: String,
        status: String,
        featureAccess: String
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val jsonBody = """
                {
                    "operation": "saveRoleDefinition",
                    "payload": {
                        "key": "$key",
                        "label": "${label.replace("\"", "\\\"")}",
                        "description": "${description.replace("\"", "\\\"")}",
                        "permissions": "${permissions.replace("\"", "\\\"")}",
                        "dashboardType": "$dashboardType",
                        "status": "$status",
                        "featureAccess": "$featureAccess"
                    }
                }
            """.trimIndent()
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/operation")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    val errorMsg = try {
                        val jsonObj = json.parseToJsonElement(bodyStr) as JsonObject
                        jsonObj["error"]?.jsonPrimitive?.contentOrNull ?: "Failed to save role definition"
                    } catch (e: Exception) {
                        "Failed to save role definition: ${response.code}"
                    }
                    Result.failure(Exception(errorMsg))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun saveEmployeeUser(
        context: Context,
        id: String?,
        name: String,
        email: String,
        password: String?,
        role: String,
        departmentId: String?,
        managerId: String?,
        title: String,
        employeeType: String?,
        compensationStatus: String?,
        workStartTime: String?,
        workEndTime: String?,
        status: String
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val idStr = if (id != null) "\"id\": \"$id\"," else ""
            val pwdStr = if (password != null && password.isNotEmpty()) "\"password\": \"$password\"," else ""
            val deptStr = if (departmentId != null && departmentId.isNotEmpty()) "\"departmentId\": \"$departmentId\"," else ""
            val mgrStr = if (managerId != null && managerId.isNotEmpty()) "\"managerId\": \"$managerId\"," else ""
            val empTypeStr = if (employeeType != null && employeeType.isNotEmpty()) "\"employeeType\": \"$employeeType\"," else ""
            val compStr = if (compensationStatus != null && compensationStatus.isNotEmpty()) "\"compensationStatus\": \"$compensationStatus\"," else ""
            val startTimeStr = if (workStartTime != null && workStartTime.isNotEmpty()) "\"workStartTime\": \"$workStartTime\"," else ""
            val endTimeStr = if (workEndTime != null && workEndTime.isNotEmpty()) "\"workEndTime\": \"$workEndTime\"," else ""
            
            val jsonBody = """
                {
                    "operation": "saveEmployeeUser",
                    "payload": {
                        $idStr
                        "name": "${name.replace("\"", "\\\"")}",
                        "email": "${email.replace("\"", "\\\"")}",
                        $pwdStr
                        "role": "$role",
                        $deptStr
                        $mgrStr
                        "title": "${title.replace("\"", "\\\"")}",
                        $empTypeStr
                        $compStr
                        $startTimeStr
                        $endTimeStr
                        "status": "$status"
                    }
                }
            """.trimIndent()
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/operation")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    val errorMsg = try {
                        val jsonObj = json.parseToJsonElement(bodyStr) as JsonObject
                        jsonObj["error"]?.jsonPrimitive?.contentOrNull ?: "Failed to save employee"
                    } catch (e: Exception) {
                        "Failed to save employee: ${response.code}"
                    }
                    Result.failure(Exception(errorMsg))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun deleteEmployeeEntity(
        context: Context,
        entityType: String,
        id: String
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val jsonBody = """
                {
                    "operation": "deleteEmployeeEntity",
                    "payload": {
                        "entityType": "$entityType",
                        "id": "$id"
                    }
                }
            """.trimIndent()
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/operation")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    val errorMsg = try {
                        val jsonObj = json.parseToJsonElement(bodyStr) as JsonObject
                        jsonObj["error"]?.jsonPrimitive?.contentOrNull ?: "Failed to delete record"
                    } catch (e: Exception) {
                        "Failed to delete record: ${response.code}"
                    }
                    Result.failure(Exception(errorMsg))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun changeEmployeePassword(
        context: Context,
        current: String,
        new: String,
        confirm: String
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val jsonBody = """
                {
                    "operation": "changeEmployeePassword",
                    "payload": {
                        "currentPassword": "${current.replace("\"", "\\\"")}",
                        "newPassword": "${new.replace("\"", "\\\"")}",
                        "confirmPassword": "${confirm.replace("\"", "\\\"")}"
                    }
                }
            """.trimIndent()
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/operation")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    val errorMsg = try {
                        val jsonObj = json.parseToJsonElement(bodyStr) as JsonObject
                        jsonObj["error"]?.jsonPrimitive?.contentOrNull ?: "Failed to update password"
                    } catch (e: Exception) {
                        "Failed to update password: ${response.code}"
                    }
                    Result.failure(Exception(errorMsg))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun saveTask(
        context: Context,
        id: String?,
        title: String,
        assignedTo: String?,
        ownerRole: String,
        priority: String,
        status: String,
        dueAt: String?,
        description: String?
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val payloadObj = mutableMapOf<String, String>()
            if (id != null) payloadObj["id"] = id
            payloadObj["title"] = title
            if (assignedTo != null && assignedTo.isNotEmpty()) payloadObj["assignedTo"] = assignedTo
            payloadObj["ownerRole"] = ownerRole
            payloadObj["priority"] = priority
            payloadObj["status"] = status
            if (dueAt != null && dueAt.isNotEmpty()) payloadObj["dueAt"] = dueAt
            if (description != null && description.isNotEmpty()) payloadObj["description"] = description
            
            val payloadPairs = payloadObj.entries.joinToString(",") { (k, v) -> "\"$k\": \"${v.replace("\"", "\\\"")}\"" }
            val jsonBody = """
                {
                    "operation": "saveTask",
                    "payload": {
                        $payloadPairs
                    }
                }
            """.trimIndent()
            
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/operation")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    val errorMsg = try {
                        val jsonObj = json.parseToJsonElement(bodyStr) as JsonObject
                        jsonObj["error"]?.jsonPrimitive?.contentOrNull ?: "Failed to save task"
                    } catch (e: Exception) {
                        "Failed to save task: ${response.code}"
                    }
                    Result.failure(Exception(errorMsg))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun saveAnnouncement(
        context: Context,
        title: String,
        body: String,
        audienceRoles: String,
        priority: String
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val jsonBody = """
                {
                    "operation": "saveAnnouncement",
                    "payload": {
                        "title": "${title.replace("\"", "\\\"")}",
                        "body": "${body.replace("\"", "\\\"")}",
                        "audienceRoles": "$audienceRoles",
                        "priority": "$priority"
                    }
                }
            """.trimIndent()
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/operation")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    val errorMsg = try {
                        val jsonObj = json.parseToJsonElement(bodyStr) as JsonObject
                        jsonObj["error"]?.jsonPrimitive?.contentOrNull ?: "Failed to save announcement"
                    } catch (e: Exception) {
                        "Failed to save announcement: ${response.code}"
                    }
                    Result.failure(Exception(errorMsg))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun updateCrmSheetRowStatus(
        context: Context,
        rowId: String,
        status: String,
        reason: String?
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val payloadObj = mutableMapOf<String, String>()
            payloadObj["rowId"] = rowId
            payloadObj["status"] = status
            if (reason != null && reason.isNotEmpty()) payloadObj["reason"] = reason
            
            val payloadPairs = payloadObj.entries.joinToString(",") { (k, v) -> "\"$k\": \"${v.replace("\"", "\\\"")}\"" }
            val jsonBody = """
                {
                    "operation": "updateCrmSheetRowStatus",
                    "payload": {
                        $payloadPairs
                    }
                }
            """.trimIndent()
            
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/operation")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    val errorMsg = try {
                        val jsonObj = json.parseToJsonElement(bodyStr) as JsonObject
                        jsonObj["error"]?.jsonPrimitive?.contentOrNull ?: "Failed to update row status"
                    } catch (e: Exception) {
                        "Failed to update row status: ${response.code}"
                    }
                    Result.failure(Exception(errorMsg))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun saveCrmSheetRequest(
        context: Context,
        title: String,
        ownerRole: String,
        audienceRoles: String?,
        audienceUsers: String?,
        editorRoles: String?,
        editorUsers: String?,
        pasteData: String
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val payloadObj = mutableMapOf<String, String>()
            payloadObj["title"] = title
            payloadObj["ownerRole"] = ownerRole
            if (audienceRoles != null) payloadObj["audienceRoles"] = audienceRoles
            if (audienceUsers != null) payloadObj["audienceUsers"] = audienceUsers
            if (editorRoles != null) payloadObj["editorRoles"] = editorRoles
            if (editorUsers != null) payloadObj["editorUsers"] = editorUsers
            payloadObj["pasteData"] = pasteData
            
            val payloadPairs = payloadObj.entries.joinToString(",") { (k, v) -> "\"$k\": \"${v.replace("\"", "\\\"").replace("\n", "\\n")}\"" }
            val jsonBody = """
                {
                    "operation": "saveCrmSheetRequest",
                    "payload": {
                        $payloadPairs
                    }
                }
            """.trimIndent()
            
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/operation")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    val errorMsg = try {
                        val jsonObj = json.parseToJsonElement(bodyStr) as JsonObject
                        jsonObj["error"]?.jsonPrimitive?.contentOrNull ?: "Failed to save CRM sheet"
                    } catch (e: Exception) {
                        "Failed to save CRM sheet: ${response.code}"
                    }
                    Result.failure(Exception(errorMsg))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun approveCrmSheet(
        context: Context,
        id: String,
        status: String
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val jsonBody = """
                {
                    "operation": "approveCrmSheet",
                    "payload": {
                        "id": "$id",
                        "status": "$status"
                    }
                }
            """.trimIndent()
            
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/operation")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    val errorMsg = try {
                        val jsonObj = json.parseToJsonElement(bodyStr) as JsonObject
                        jsonObj["error"]?.jsonPrimitive?.contentOrNull ?: "Failed to approve CRM sheet"
                    } catch (e: Exception) {
                        "Failed to approve CRM sheet: ${response.code}"
                    }
                    Result.failure(Exception(errorMsg))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun approveEmployeeDocument(
        context: Context,
        id: String
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val jsonBody = """
                {
                    "operation": "approveEmployeeDocument",
                    "payload": {
                        "id": "$id"
                    }
                }
            """.trimIndent()
            
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/operation")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    val errorMsg = try {
                        val jsonObj = json.parseToJsonElement(bodyStr) as JsonObject
                        jsonObj["error"]?.jsonPrimitive?.contentOrNull ?: "Failed to approve document"
                    } catch (e: Exception) {
                        "Failed to approve document: ${response.code}"
                    }
                    Result.failure(Exception(errorMsg))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun saveDepartment(
        context: Context,
        id: String?,
        name: String,
        description: String?,
        managerId: String?,
        active: String
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val payloadObj = mutableMapOf<String, String>()
            if (id != null) payloadObj["id"] = id
            payloadObj["name"] = name
            if (description != null) payloadObj["description"] = description
            if (managerId != null && managerId.isNotEmpty()) payloadObj["managerId"] = managerId
            payloadObj["active"] = active
            
            val payloadPairs = payloadObj.entries.joinToString(",") { (k, v) -> "\"$k\": \"${v.replace("\"", "\\\"").replace("\n", "\\n")}\"" }
            val jsonBody = """
                {
                    "operation": "saveDepartment",
                    "payload": {
                        $payloadPairs
                    }
                }
            """.trimIndent()
            
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/operation")
                .header("Authorization", "Bearer $token")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    val errorMsg = try {
                        val jsonObj = json.parseToJsonElement(bodyStr) as JsonObject
                        jsonObj["error"]?.jsonPrimitive?.contentOrNull ?: "Failed to save department"
                    } catch (e: Exception) {
                        "Failed to save department: ${response.code}"
                    }
                    Result.failure(Exception(errorMsg))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun fetchLetter(context: Context, employeeId: String, type: String): Result<String> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val encodedType = java.net.URLEncoder.encode(type, "UTF-8")
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/letter?employeeId=$employeeId&type=$encodedType")
                .header("Authorization", "Bearer $token")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Result.success(bodyStr)
                } else {
                    Result.failure(Exception("Failed to fetch letter: ${response.code}"))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }

    suspend fun fetchIdCard(context: Context, employeeId: String): Result<String> = withContext(Dispatchers.IO) {
        try {
            val token = getToken(context) ?: return@withContext Result.failure(Exception("No auth token"))
            val request = Request.Builder()
                .url("$BASE_URL/api/employee/id-card?employeeId=$employeeId")
                .header("Authorization", "Bearer $token")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    Result.success(bodyStr)
                } else {
                    Result.failure(Exception("Failed to fetch ID card: ${response.code}"))
                }
            }
        } catch (e: IOException) {
            Result.failure(getFriendlyError(e))
        }
    }
}
