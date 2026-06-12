@file:Suppress("DEPRECATION")
package com.bluevolt.app.ui.portal

import android.content.Intent
import android.net.Uri
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.ripple.rememberRipple
import androidx.compose.material3.*
import androidx.compose.material3.ripple
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.bluevolt.app.R
import com.bluevolt.app.data.NetworkClient
import com.bluevolt.app.theme.*
import com.bluevolt.app.ui.login.PremiumTextField
import kotlinx.coroutines.launch
import kotlinx.serialization.json.*
import java.text.SimpleDateFormat
import java.util.*

// Helper functions for date and shift timing calculations
fun parseIsoDateTime(isoStr: String?): Date? {
    if (isoStr == null) return null
    return try {
        val cleaned = isoStr.substringBefore(".").substringBefore("Z")
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        sdf.parse(cleaned)
    } catch (e: Exception) {
        null
    }
}

fun calculateExpectedHours(startTimeStr: String?, endTimeStr: String?): Double {
    val start = startTimeStr ?: "09:00"
    val end = endTimeStr ?: "18:00"
    return try {
        val startParts = start.split(":")
        val endParts = end.split(":")
        val startMin = startParts[0].toInt() * 60 + startParts[1].toInt()
        var endMin = endParts[0].toInt() * 60 + endParts[1].toInt()
        if (endMin <= startMin) {
            endMin += 24 * 60 // cross midnight shift
        }
        (endMin - startMin).toDouble() / 60.0
    } catch (e: Exception) {
        9.0
    }
}

fun calculateLeaveDays(startStr: String?, endStr: String?): Int {
    if (startStr == null || endStr == null) return 0
    return try {
        val format = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val startClean = startStr.substringBefore("T")
        val endClean = endStr.substringBefore("T")
        val startDate = format.parse(startClean)
        val endDate = format.parse(endClean)
        if (startDate != null && endDate != null) {
            val diffMs = endDate.time - startDate.time
            val diffDays = (diffMs / (1000 * 60 * 60 * 24)).toInt()
            maxOf(1, diffDays + 1)
        } else 0
    } catch (e: Exception) {
        1
    }
}

data class UserCapabilities(
    val isSuperiorDashboard: Boolean = false,
    val canManage: Boolean = false,
    val canManageAccess: Boolean = false,
    val canUseCrm: Boolean = false,
    val canManageCrmSheets: Boolean = false,
    val canManageApplicants: Boolean = false,
    val canManageOps: Boolean = false,
    val canManagePayroll: Boolean = false,
    val canReviewPerformance: Boolean = false,
    val canViewDocuments: Boolean = true,
    val canManageDocuments: Boolean = false,
    val canSignDocuments: Boolean = false,
    val canManageExpenses: Boolean = false,
    val canUseChat: Boolean = true,
    val canViewEmployees: Boolean = false,
    val canRequestCrmSource: Boolean = false
)

data class QuickActionDef(
    val title: String,
    val icon: ImageVector,
    val iconBg: Color,
    val iconColor: Color,
    val actionKey: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PortalScreen(
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var activeTab by remember { mutableStateOf(0) } 
    var portalDataStr by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var openLeaveDialogFromFAB by remember { mutableStateOf(false) }
    var openExpenseDialogFromFAB by remember { mutableStateOf(false) }
    var showApplicantsOverlay by remember { mutableStateOf(false) }
    var showWorkOpsOverlay by remember { mutableStateOf(false) }
    var showExpensesOverlay by remember { mutableStateOf(false) }
    var showReportsOverlay by remember { mutableStateOf(false) }
    var showAnnouncementsOverlay by remember { mutableStateOf(false) }
    var showMeetingsOverlay by remember { mutableStateOf(false) }
    var showResourcesOverlay by remember { mutableStateOf(false) }
    var showPrivilegesOverlay by remember { mutableStateOf(false) }
    var showLeavesOverlay by remember { mutableStateOf(false) }

    // Overlay screen toggles
    var showCrmOverlay by remember { mutableStateOf(false) }
    var showAttendanceOverlay by remember { mutableStateOf(false) }
    var showApprovalsOverlay by remember { mutableStateOf(false) }
    var showDocsOverlay by remember { mutableStateOf(false) }
    var showSupportOverlay by remember { mutableStateOf(false) }
    var showStaffOverlay by remember { mutableStateOf(false) }
    var showPayrollOverlay by remember { mutableStateOf(false) }
    var showAuditOverlay by remember { mutableStateOf(false) }

    var activeDocumentViewUrl by remember { mutableStateOf<String?>(null) }
    var activeDocumentTitle by remember { mutableStateOf<String?>(null) }

    // Attendance summary popup
    var showClockOutSummaryDialog by remember { mutableStateOf(false) }
    var summaryTotalHours by remember { mutableStateOf(0.0) }
    var summaryExpectedHours by remember { mutableStateOf(8.0) }
    var summaryStatus by remember { mutableStateOf("Present") }

    // Group chat logs
    val groupChatMessages = remember { mutableStateListOf<JsonObject>() }

    // Parse JSON
    val json = remember { Json { ignoreUnknownKeys = true } }
    val dataObj = remember(portalDataStr) {
        if (portalDataStr != null) {
            try {
                json.parseToJsonElement(portalDataStr!!).jsonObject
            } catch (e: Exception) {
                null
            }
        } else null
    }

    // Role Capabilities
    val capabilities = remember(dataObj) {
        val capObj = dataObj?.get("capabilities")?.jsonObject
        val canManage = capObj?.get("canManage")?.jsonPrimitive?.booleanOrNull ?: false
        val canManageOps = capObj?.get("canManageOps")?.jsonPrimitive?.booleanOrNull ?: false
        val canUseSuperiorDashboard = capObj?.get("canUseSuperiorDashboard")?.jsonPrimitive?.booleanOrNull ?: false
        val isSuperior = canManage || canManageOps || canUseSuperiorDashboard
        
        if (isSuperior) {
            UserCapabilities(
                isSuperiorDashboard = true,
                canManage = true,
                canManageAccess = true,
                canUseCrm = true,
                canManageCrmSheets = true,
                canManageApplicants = true,
                canManageOps = true,
                canManagePayroll = true,
                canReviewPerformance = true,
                canViewDocuments = true,
                canManageDocuments = true,
                canSignDocuments = true,
                canManageExpenses = true,
                canUseChat = true,
                canViewEmployees = true,
                canRequestCrmSource = true
            )
        } else {
            UserCapabilities(
                isSuperiorDashboard = false,
                canManage = canManage,
                canManageAccess = capObj?.get("canManageAccess")?.jsonPrimitive?.booleanOrNull ?: false,
                canUseCrm = capObj?.get("canUseCrm")?.jsonPrimitive?.booleanOrNull ?: false,
                canManageCrmSheets = capObj?.get("canManageCrmSheets")?.jsonPrimitive?.booleanOrNull ?: false,
                canManageApplicants = capObj?.get("canManageApplicants")?.jsonPrimitive?.booleanOrNull ?: false,
                canManageOps = canManageOps,
                canManagePayroll = capObj?.get("canManagePayroll")?.jsonPrimitive?.booleanOrNull ?: false,
                canReviewPerformance = capObj?.get("canReviewPerformance")?.jsonPrimitive?.booleanOrNull ?: false,
                canViewDocuments = capObj?.get("canViewDocuments")?.jsonPrimitive?.booleanOrNull ?: true,
                canManageDocuments = capObj?.get("canManageDocuments")?.jsonPrimitive?.booleanOrNull ?: false,
                canSignDocuments = capObj?.get("canSignDocuments")?.jsonPrimitive?.booleanOrNull ?: false,
                canManageExpenses = capObj?.get("canManageExpenses")?.jsonPrimitive?.booleanOrNull ?: false,
                canUseChat = capObj?.get("canUseChat")?.jsonPrimitive?.booleanOrNull ?: true,
                canViewEmployees = capObj?.get("canViewEmployees")?.jsonPrimitive?.booleanOrNull ?: false,
                canRequestCrmSource = capObj?.get("canRequestCrmSource")?.jsonPrimitive?.booleanOrNull ?: false
            )
        }
    }

    val attendanceList = remember(dataObj) {
        dataObj?.get("attendance")?.jsonArray
    }
    val activeSession = remember(attendanceList) {
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        attendanceList?.firstOrNull {
            val entry = it.jsonObject
            val workDate = entry["workDate"]?.jsonPrimitive?.contentOrNull
            entry["loginAt"]?.jsonPrimitive?.contentOrNull != null &&
                    entry["logoutAt"]?.jsonPrimitive?.contentOrNull == null &&
                    workDate != null && workDate.startsWith(todayStr)
        }?.jsonObject
    }
    val isClockedIn = activeSession != null

    val currentUser = remember(dataObj) {
        val usersList = dataObj?.get("users")?.jsonArray
        val sessionObj = dataObj?.get("session")?.jsonObject
        val sessionId = sessionObj?.get("id")?.jsonPrimitive?.intOrNull
        usersList?.firstOrNull { it.jsonObject["id"]?.jsonPrimitive?.intOrNull == sessionId }?.jsonObject
    }

    // Helper to refresh data
    fun refreshData(tabKey: String) {
        isLoading = true
        scope.launch {
            val result = NetworkClient.fetchPortalData(context, tabKey)
            isLoading = false
            result.fold(
                onSuccess = {
                    portalDataStr = it
                    NetworkClient.saveCachedPortalData(context, tabKey, it)
                    errorMessage = null
                },
                onFailure = {
                    val cached = NetworkClient.getCachedPortalData(context, tabKey)
                    if (cached != null) {
                        portalDataStr = cached
                        errorMessage = "Sync issue: using cached data"
                    } else {
                        errorMessage = it.message ?: "Failed to retrieve data"
                    }
                }
            )
        }
    }

    val currentTabKey = remember(activeTab, capabilities.isSuperiorDashboard) {
        when (activeTab) {
            0 -> "dashboard"
            1 -> "ops"
            2 -> "dashboard"
            3 -> "notifications"
            4 -> "dashboard"
            else -> "dashboard"
        }
    }

    // Load Cache instantly on active tab selection
    LaunchedEffect(activeTab, capabilities.isSuperiorDashboard) {
        val cached = NetworkClient.getCachedPortalData(context, currentTabKey)
        if (cached != null) {
            portalDataStr = cached
        }
        refreshData(currentTabKey)
    }

    // Load Chat messages locally
    LaunchedEffect(dataObj) {
        val chatArr = dataObj?.get("chatMessages")?.jsonArray
        if (chatArr != null) {
            groupChatMessages.clear()
            chatArr.forEach { groupChatMessages.add(it.jsonObject) }
        }
    }

    Box(modifier = modifier.fillMaxSize().background(SassBackground)) {
        Scaffold(
            modifier = Modifier.fillMaxSize(),
            containerColor = Color.Transparent,
            topBar = {
                CenterAlignedTopAppBar(
                    title = {
                        Text(
                            text = "BLUEVOLT",
                            fontWeight = FontWeight.ExtraBold,
                            color = SassTextPrimary,
                            letterSpacing = 1.sp,
                            fontSize = 20.sp,
                            fontFamily = FontFamily.SansSerif
                        )
                    },
                    actions = {
                        // Work Knob shift control in top action bar
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.padding(end = 4.dp)
                        ) {
                            Text(
                                text = if (isClockedIn) "WORKING" else "OFF DUTY",
                                color = if (isClockedIn) SassSuccess else SassTextSecondary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                            
                            // Sliding Switch Control
                            Box(
                                modifier = Modifier
                                    .width(52.dp)
                                    .height(28.dp)
                                    .background(
                                        color = if (isClockedIn) SassSuccess.copy(alpha = 0.15f) else Color(0xFFE2E8F0),
                                        shape = RoundedCornerShape(14.dp)
                                    )
                                    .border(
                                        width = 1.dp,
                                        color = if (isClockedIn) SassSuccess else Color(0xFFCBD5E1),
                                        shape = RoundedCornerShape(14.dp)
                                    )
                                    .clickable(
                                        interactionSource = remember { MutableInteractionSource() },
                                        indication = null
                                    ) {
                                        if (isClockedIn) {
                                            // Handle clock out calculation summary dialog
                                            val loginTimeStr = activeSession?.get("loginAt")?.jsonPrimitive?.contentOrNull
                                            val loginDate = parseIsoDateTime(loginTimeStr) ?: Date(System.currentTimeMillis() - 8 * 60 * 60 * 1000)
                                            val diffHours = (System.currentTimeMillis() - loginDate.time).toDouble() / (1000 * 60 * 60)
                                            
                                            val workStart = currentUser?.get("workStartTime")?.jsonPrimitive?.contentOrNull ?: "09:00"
                                            val workEnd = currentUser?.get("workEndTime")?.jsonPrimitive?.contentOrNull ?: "18:00"
                                            val expectedHours = calculateExpectedHours(workStart, workEnd)
                                            
                                            summaryTotalHours = diffHours
                                            summaryExpectedHours = expectedHours
                                            summaryStatus = if (diffHours + 0.01 >= expectedHours) "Present" else "Half-day"
                                            showClockOutSummaryDialog = true
                                        } else {
                                            isLoading = true
                                            scope.launch {
                                                NetworkClient.clockIn(context).fold(
                                                    onSuccess = { refreshData(currentTabKey) },
                                                    onFailure = { errorMessage = it.message; isLoading = false }
                                                )
                                            }
                                        }
                                    }
                                    .padding(2.dp),
                                contentAlignment = if (isClockedIn) Alignment.CenterEnd else Alignment.CenterStart
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(24.dp)
                                        .shadow(elevation = 2.dp, shape = CircleShape)
                                        .background(
                                            color = if (isClockedIn) SassSuccess else Color.White,
                                            shape = CircleShape
                                        )
                                )
                            }
                        }

                        IconButton(onClick = { showSupportOverlay = true }) {
                            Icon(Icons.Default.Send, contentDescription = "Group Chat", tint = SassPrimary)
                        }
                    },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                        containerColor = SassBackground
                    )
                )
            },
            bottomBar = {
                Box(
                    modifier = Modifier.fillMaxWidth().wrapContentHeight(),
                    contentAlignment = Alignment.BottomCenter
                ) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(84.dp)
                            .shadow(
                                elevation = 16.dp,
                                ambientColor = SassTextPrimary.copy(alpha = 0.08f),
                                spotColor = SassTextPrimary.copy(alpha = 0.08f)
                            ),
                        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                        colors = CardDefaults.cardColors(containerColor = SassCard)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxSize(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            BottomNavItem(
                                icon = Icons.Default.Home,
                                label = "Home",
                                selected = activeTab == 0,
                                onClick = { activeTab = 0 },
                                modifier = Modifier.weight(1f)
                            )
                            BottomNavItem(
                                icon = Icons.Default.List,
                                label = "Tasks",
                                selected = activeTab == 1,
                                onClick = { activeTab = 1 },
                                modifier = Modifier.weight(1f)
                            )
                            
                            // Center Highlighted AI tab
                            Box(
                                modifier = Modifier.weight(1.2f).fillMaxHeight(),
                                contentAlignment = Alignment.Center
                            ) {
                                Box(
                                    modifier = Modifier
                                        .offset(y = (-14).dp)
                                        .size(56.dp)
                                        .shadow(
                                            elevation = 8.dp,
                                            shape = CircleShape,
                                            ambientColor = SassPrimary.copy(alpha = 0.3f),
                                            spotColor = SassPrimary.copy(alpha = 0.3f)
                                        )
                                        .background(
                                            brush = Brush.linearGradient(colors = listOf(SassPrimary, SassSecondary)),
                                            shape = CircleShape
                                        )
                                        .clickable(
                                            interactionSource = remember { MutableInteractionSource() },
                                            indication = ripple(color = Color.White.copy(alpha = 0.2f)),
                                            onClick = { activeTab = 2 }
                                        ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Star,
                                        contentDescription = "AI assistant",
                                        tint = Color.White,
                                        modifier = Modifier.size(26.dp)
                                    )
                                }
                            }
                            
                            BottomNavItem(
                                icon = Icons.Default.Notifications,
                                label = "Inbox",
                                selected = activeTab == 3,
                                onClick = { activeTab = 3 },
                                modifier = Modifier.weight(1f)
                            )
                            BottomNavItem(
                                icon = Icons.Default.AccountCircle,
                                label = "Profile",
                                selected = activeTab == 4,
                                onClick = { activeTab = 4 },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                if (isLoading && dataObj == null) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = SassPrimary)
                    }
                } else {
                    when (activeTab) {
                        0 -> HomeScreen(
                            data = dataObj,
                            isSuperior = capabilities.isSuperiorDashboard,
                            isLoading = isLoading,
                            capabilities = capabilities,
                            onOpenCrm = { showCrmOverlay = true },
                            onOpenAttendance = { showAttendanceOverlay = true },
                            onOpenSupport = { showSupportOverlay = true },
                            onOpenApprovals = { showApprovalsOverlay = true },
                            onOpenDocs = { showDocsOverlay = true },
                            onOpenStaff = { showStaffOverlay = true },
                            onOpenPayroll = { showPayrollOverlay = true },
                            onOpenReviews = {},
                            onOpenAudit = { showAuditOverlay = true },
                            onOpenApplicants = { showApplicantsOverlay = true },
                            onOpenWorkOps = { showWorkOpsOverlay = true },
                            onOpenExpenses = { showExpensesOverlay = true },
                            onOpenReports = { showReportsOverlay = true },
                            onOpenAnnouncements = { showAnnouncementsOverlay = true },
                            onOpenMeetings = { showMeetingsOverlay = true },
                            onOpenResources = { showResourcesOverlay = true },
                            onOpenPrivileges = { showPrivilegesOverlay = true },
                            onOpenLeaves = { showLeavesOverlay = true },
                            onSwitchToTasks = { activeTab = 1 }
                        )
                        1 -> TasksScreen(
                            data = dataObj,
                            isLoading = isLoading,
                            isSuperior = capabilities.isSuperiorDashboard,
                            onUpdateTaskStatus = { taskId, newStatus ->
                                isLoading = true
                                scope.launch {
                                    NetworkClient.updateRecordStatus(context, "task", taskId, newStatus).fold(
                                        onSuccess = { refreshData(currentTabKey) },
                                        onFailure = { errorMessage = it.message; isLoading = false }
                                    )
                                }
                            },
                            onSaveTask = { id, title, assignedTo, ownerRole, priority, status, dueAt, description ->
                                isLoading = true
                                scope.launch {
                                    NetworkClient.saveTask(
                                        context, id, title, assignedTo, ownerRole, priority, status, dueAt, description
                                    ).fold(
                                        onSuccess = { refreshData(currentTabKey) },
                                        onFailure = { errorMessage = it.message; isLoading = false }
                                    )
                                }
                            }
                        )
                        2 -> AiAssistantScreen(
                            data = dataObj
                        )
                        3 -> NotificationsScreen(
                            data = dataObj
                        )
                        4 -> ProfileScreen(
                            data = dataObj,
                            onLogout = onLogout,
                            onOpenDocs = { showDocsOverlay = true }
                        )
                    }
                }

                // Error Connection Alert Overlay
                if (errorMessage != null && portalDataStr == null) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFEE2E2)),
                        shape = RoundedCornerShape(20.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp)
                            .shadow(8.dp, RoundedCornerShape(20.dp))
                            .align(Alignment.TopCenter)
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Default.Warning, contentDescription = "Alert", tint = SassDanger)
                                Text(
                                    text = "Connection Alert",
                                    color = Color(0xFF991B1B),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp
                                )
                            }
                            Text(
                                text = errorMessage!!,
                                color = Color(0xFF7F1D1D),
                                fontSize = 14.sp
                            )
                            Button(
                                onClick = { refreshData(currentTabKey) },
                                colors = ButtonDefaults.buttonColors(containerColor = SassDanger),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.align(Alignment.End)
                            ) {
                                Text("Retry Connection", color = Color.White, fontSize = 13.sp)
                            }
                        }
                    }
                }

                // Sync Warning Pill
                if (errorMessage != null && portalDataStr != null) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .padding(top = 12.dp)
                            .shadow(4.dp, RoundedCornerShape(20.dp))
                            .background(Color(0xFFFEF3C7), RoundedCornerShape(20.dp))
                            .clickable { errorMessage = null }
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Box(modifier = Modifier.size(8.dp).background(SassWarning, CircleShape))
                            Text(
                                text = "Offline Sync Mode. Tap to Retry.",
                                color = Color(0xFF92400E),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }
        }

        // Attendance Shift Summary Popup
        if (showClockOutSummaryDialog) {
            AlertDialog(
                onDismissRequest = { showClockOutSummaryDialog = false },
                title = { Text(text = "End Shift Summary", style = SassCardTitle, color = SassTextPrimary) },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(text = "Shift Duration details computed:", color = SassTextSecondary, fontSize = 14.sp)
                        Text(text = "Worked: ${summaryTotalHours.format(2)} hours", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text(text = "Scheduled Required: ${summaryExpectedHours.format(2)} hours", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text(
                            text = "Estimated status: ${if (summaryStatus == "Present") "Present (Full Day)" else "Half-day"}",
                            color = if (summaryStatus == "Present") SassSuccess else SassWarning,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 16.sp
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            showClockOutSummaryDialog = false
                            isLoading = true
                            scope.launch {
                                NetworkClient.clockOut(context).fold(
                                    onSuccess = { refreshData(currentTabKey) },
                                    onFailure = { errorMessage = it.message; isLoading = false }
                                )
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = SassPrimary),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Text("Confirm Shift End", color = Color.White)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showClockOutSummaryDialog = false }) {
                        Text("Cancel", color = SassTextSecondary)
                    }
                },
                containerColor = SassCard,
                shape = RoundedCornerShape(28.dp)
            )
        }

        // Overlay Screens
        AnimatedVisibility(
            visible = showCrmOverlay,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            CrmOverlayScreen(
                data = dataObj,
                canManageCrmSheets = capabilities.canManageCrmSheets || capabilities.canRequestCrmSource,
                onClose = { showCrmOverlay = false },
                onImportSheet = { title, pasteData ->
                    isLoading = true
                    scope.launch {
                        val userRole = NetworkClient.getUserRole(context) ?: "employee"
                        NetworkClient.saveCrmSheetRequest(
                            context = context,
                            title = title,
                            ownerRole = userRole,
                            audienceRoles = "all",
                            audienceUsers = null,
                            editorRoles = userRole,
                            editorUsers = null,
                            pasteData = pasteData
                        ).fold(
                            onSuccess = { refreshData(currentTabKey) },
                            onFailure = { errorMessage = it.message; isLoading = false }
                        )
                    }
                },
                onUpdateRowStatus = { rowId, status, reason ->
                    isLoading = true
                    scope.launch {
                        NetworkClient.updateCrmSheetRowStatus(context, rowId, status, reason).fold(
                            onSuccess = { refreshData(currentTabKey) },
                            onFailure = { errorMessage = it.message; isLoading = false }
                        )
                    }
                }
            )
        }

        AnimatedVisibility(
            visible = showAttendanceOverlay,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            AttendanceOverlayScreen(
                data = dataObj,
                isClockedIn = isClockedIn,
                clockInTime = activeSession?.get("loginAt")?.jsonPrimitive?.contentOrNull,
                isLoading = isLoading,
                onClose = { showAttendanceOverlay = false },
                onClockIn = {
                    isLoading = true
                    scope.launch {
                        NetworkClient.clockIn(context).fold(
                            onSuccess = { refreshData(currentTabKey) },
                            onFailure = { errorMessage = it.message; isLoading = false }
                        )
                    }
                },
                onClockOut = {
                    val loginTimeStr = activeSession?.get("loginAt")?.jsonPrimitive?.contentOrNull
                    val loginDate = parseIsoDateTime(loginTimeStr) ?: Date(System.currentTimeMillis() - 8 * 60 * 60 * 1000)
                    val diffHours = (System.currentTimeMillis() - loginDate.time).toDouble() / (1000 * 60 * 60)
                    
                    val workStart = currentUser?.get("workStartTime")?.jsonPrimitive?.contentOrNull ?: "09:00"
                    val workEnd = currentUser?.get("workEndTime")?.jsonPrimitive?.contentOrNull ?: "18:00"
                    val expectedHours = calculateExpectedHours(workStart, workEnd)
                    
                    summaryTotalHours = diffHours
                    summaryExpectedHours = expectedHours
                    summaryStatus = if (diffHours + 0.01 >= expectedHours) "Present" else "Half-day"
                    showClockOutSummaryDialog = true
                }
            )
        }

        AnimatedVisibility(
            visible = showApprovalsOverlay,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            ApprovalsOverlayScreen(
                data = dataObj,
                canManageExpenses = capabilities.canManageExpenses,
                onClose = { showApprovalsOverlay = false },
                onAction = { entity, id, newStatus ->
                    isLoading = true
                    scope.launch {
                        val result = when (entity) {
                            "crmSheet" -> NetworkClient.approveCrmSheet(context, id, newStatus)
                            "document" -> NetworkClient.approveEmployeeDocument(context, id)
                            else -> NetworkClient.updateRecordStatus(context, entity, id, newStatus)
                        }
                        result.fold(
                            onSuccess = { refreshData(currentTabKey) },
                            onFailure = { errorMessage = it.message; isLoading = false }
                        )
                    }
                }
            )
        }

        AnimatedVisibility(
            visible = showLeavesOverlay,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            LeavesOverlayScreen(
                data = dataObj,
                openLeaveFAB = openLeaveDialogFromFAB,
                openExpenseFAB = openExpenseDialogFromFAB,
                onClose = { showLeavesOverlay = false },
                onClearFABStates = {
                    openLeaveDialogFromFAB = false
                    openExpenseDialogFromFAB = false
                },
                onSubmitLeave = { type, start, end, reason ->
                    isLoading = true
                    scope.launch {
                        NetworkClient.submitLeaveRequest(context, type, start, end, reason).fold(
                            onSuccess = { refreshData(currentTabKey) },
                            onFailure = { errorMessage = it.message; isLoading = false }
                        )
                    }
                },
                onSubmitExpense = { category, amount, date, notes ->
                    isLoading = true
                    scope.launch {
                        NetworkClient.submitExpenseClaim(context, category, amount, date, notes).fold(
                            onSuccess = { refreshData(currentTabKey) },
                            onFailure = { errorMessage = it.message; isLoading = false }
                        )
                    }
                }
            )
        }

        AnimatedVisibility(
            visible = showDocsOverlay,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            DocsOverlayScreen(
                data = dataObj,
                canSignDocuments = capabilities.canSignDocuments,
                onClose = { showDocsOverlay = false },
                onViewDocument = { title, url ->
                    activeDocumentTitle = title
                    activeDocumentViewUrl = url
                },
                onSignDocument = { docId ->
                    isLoading = true
                    scope.launch {
                        NetworkClient.updateRecordStatus(context, "document", docId, "Approved").fold(
                            onSuccess = { refreshData(currentTabKey) },
                            onFailure = { errorMessage = it.message; isLoading = false }
                        )
                    }
                }
            )
        }

        AnimatedVisibility(
            visible = showSupportOverlay,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            SupportOverlayScreen(
                messages = groupChatMessages,
                onClose = { showSupportOverlay = false },
                onSendMessage = { body ->
                    scope.launch {
                        NetworkClient.sendGroupChatMessage(context, body).fold(
                            onSuccess = { refreshData(currentTabKey) },
                            onFailure = { errorMessage = it.message }
                        )
                    }
                }
            )
        }

        AnimatedVisibility(
            visible = showStaffOverlay,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            StaffOverlayScreen(
                data = dataObj,
                canManage = capabilities.canManage,
                onClose = { showStaffOverlay = false },
                onSaveEmployee = { id, name, email, password, role, deptId, mgrId, title, empType, comp, start, end, stat ->
                    isLoading = true
                    scope.launch {
                        NetworkClient.saveEmployeeUser(
                            context, id, name, email, password, role, deptId, mgrId, title, empType, comp, start, end, stat
                        ).fold(
                            onSuccess = { refreshData(currentTabKey) },
                            onFailure = { errorMessage = it.message; isLoading = false }
                        )
                    }
                },
                onDeleteEmployee = { id ->
                    isLoading = true
                    scope.launch {
                        NetworkClient.deleteEmployeeEntity(context, "employee", id).fold(
                            onSuccess = { refreshData(currentTabKey) },
                            onFailure = { errorMessage = it.message; isLoading = false }
                        )
                    }
                },
                onSaveDepartment = { id, name, desc, mgrId, active ->
                    isLoading = true
                    scope.launch {
                        NetworkClient.saveDepartment(context, id, name, desc, mgrId, active).fold(
                            onSuccess = { refreshData(currentTabKey) },
                            onFailure = { errorMessage = it.message; isLoading = false }
                        )
                    }
                },
                onDeleteDepartment = { id ->
                    isLoading = true
                    scope.launch {
                        NetworkClient.deleteEmployeeEntity(context, "department", id).fold(
                            onSuccess = { refreshData(currentTabKey) },
                            onFailure = { errorMessage = it.message; isLoading = false }
                        )
                    }
                }
            )
        }

        AnimatedVisibility(
            visible = showPayrollOverlay,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            PayrollOverlayScreen(
                data = dataObj,
                onClose = { showPayrollOverlay = false }
            )
        }

        // Reviews overlay removed

        AnimatedVisibility(
            visible = showAuditOverlay,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            AuditOverlayScreen(
                data = dataObj,
                onClose = { showAuditOverlay = false }
            )
        }

        AnimatedVisibility(
            visible = showApplicantsOverlay,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            ApplicantsOverlayScreen(
                data = dataObj,
                canManageApplicants = capabilities.canManageApplicants,
                onClose = { showApplicantsOverlay = false },
                onAction = { id, stage ->
                    isLoading = true
                    scope.launch {
                        NetworkClient.updateRecordStatus(context, "applicant", id, stage).fold(
                            onSuccess = { refreshData(currentTabKey) },
                            onFailure = { errorMessage = it.message; isLoading = false }
                        )
                    }
                }
            )
        }

        AnimatedVisibility(
            visible = showWorkOpsOverlay,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            WorkOpsOverlayScreen(
                data = dataObj,
                onClose = { showWorkOpsOverlay = false }
            )
        }

        AnimatedVisibility(
            visible = showExpensesOverlay,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            ExpensesOverlayScreen(
                data = dataObj,
                canManageExpenses = capabilities.canManageExpenses,
                onClose = { showExpensesOverlay = false },
                onAction = { id, status ->
                    isLoading = true
                    scope.launch {
                        NetworkClient.updateRecordStatus(context, "expense", id, status).fold(
                            onSuccess = { refreshData(currentTabKey) },
                            onFailure = { errorMessage = it.message; isLoading = false }
                        )
                    }
                },
                onSubmitExpense = { category, amount, date, notes ->
                    isLoading = true
                    scope.launch {
                        NetworkClient.submitExpenseClaim(context, category, amount, date, notes).fold(
                            onSuccess = { refreshData(currentTabKey) },
                            onFailure = { errorMessage = it.message; isLoading = false }
                        )
                    }
                }
            )
        }

        AnimatedVisibility(
            visible = showReportsOverlay,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            ReportsOverlayScreen(
                data = dataObj,
                onClose = { showReportsOverlay = false }
            )
        }

        AnimatedVisibility(
            visible = showAnnouncementsOverlay,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            AnnouncementsOverlayScreen(
                data = dataObj,
                canBroadcast = capabilities.isSuperiorDashboard,
                onClose = { showAnnouncementsOverlay = false },
                onSubmitAnnouncement = { title, body, audienceRoles, priority ->
                    isLoading = true
                    scope.launch {
                        NetworkClient.saveAnnouncement(
                            context, title, body, audienceRoles, priority
                        ).fold(
                            onSuccess = { refreshData(currentTabKey) },
                            onFailure = { errorMessage = it.message; isLoading = false }
                        )
                    }
                }
            )
        }

        AnimatedVisibility(
            visible = showMeetingsOverlay,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            MeetingsOverlayScreen(
                data = dataObj,
                canScheduleMeetings = capabilities.isSuperiorDashboard,
                onClose = { showMeetingsOverlay = false },
                onSubmitMeeting = { title, start, end, url, roles, users, notes ->
                    isLoading = true
                    scope.launch {
                        NetworkClient.saveMeeting(context, null, title, start, end, url, roles, users, notes).fold(
                            onSuccess = { refreshData(currentTabKey) },
                            onFailure = { errorMessage = it.message; isLoading = false }
                        )
                    }
                }
            )
        }

        AnimatedVisibility(
            visible = showResourcesOverlay,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            ResourcesOverlayScreen(
                data = dataObj,
                canManageResources = capabilities.isSuperiorDashboard,
                onClose = { showResourcesOverlay = false },
                onSubmitResource = { title, resType, url, desc, roles, users, tags ->
                    isLoading = true
                    scope.launch {
                        NetworkClient.saveResource(context, null, title, resType, url, desc, roles, users, tags).fold(
                            onSuccess = { refreshData(currentTabKey) },
                            onFailure = { errorMessage = it.message; isLoading = false }
                        )
                    }
                }
            )
        }

        AnimatedVisibility(
            visible = showPrivilegesOverlay,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            PrivilegesOverlayScreen(
                data = dataObj,
                canManageAccess = capabilities.canManageAccess,
                onClose = { showPrivilegesOverlay = false },
                onSubmitRoleDefinition = { key, label, desc, permissions, dashType, status, features ->
                    isLoading = true
                    scope.launch {
                        NetworkClient.saveRoleDefinition(context, key, label, desc, permissions, dashType, status, features).fold(
                            onSuccess = { refreshData(currentTabKey) },
                            onFailure = { errorMessage = it.message; isLoading = false }
                        )
                    }
                }
            )
        }

        // Fullscreen Document Web Viewer overlay
        activeDocumentViewUrl?.let { docUrl ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(SassBackground)
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(SassCard)
                            .padding(horizontal = 12.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = { activeDocumentViewUrl = null }) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Close Document", tint = SassTextPrimary)
                        }
                        Text(
                            text = activeDocumentTitle ?: "Document Viewer",
                            color = SassTextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            modifier = Modifier.weight(1f)
                        )
                    }
                    AndroidView(
                        factory = { ctx ->
                            WebView(ctx).apply {
                                settings.javaScriptEnabled = true
                                webViewClient = WebViewClient()
                                loadUrl(docUrl)
                            }
                        },
                        modifier = Modifier.weight(1f).fillMaxWidth()
                    )
                }
            }
        }
    }
}

// Simple extension helper for format decimal printing
fun Double.format(digits: Int): String = String.format("%.${digits}f", this)

@Suppress("DEPRECATION")
@Composable
fun BottomNavItem(
    icon: ImageVector,
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val interactionSource = remember { MutableInteractionSource() }
    Box(
        modifier = modifier
            .fillMaxHeight()
            .clickable(
                interactionSource = interactionSource,
                indication = ripple(color = SassPrimary.copy(alpha = 0.04f)),
                onClick = onClick
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = if (selected) SassPrimary else SassTextSecondary,
                modifier = Modifier.size(24.dp)
            )
            Text(
                text = label,
                color = if (selected) SassPrimary else SassTextSecondary,
                fontSize = 11.sp,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium
            )
        }
    }
}

@Suppress("DEPRECATION")
@Composable
fun SassCard(
    modifier: Modifier = Modifier,
    radius: Dp = 28.dp,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    
    val scale by animateFloatAsState(
        targetValue = if (isPressed && onClick != null) 0.98f else 1f,
        animationSpec = tween(durationMillis = 150)
    )

    var cardModifier = modifier
        .graphicsLayer {
            scaleX = scale
            scaleY = scale
        }
        .shadow(
            elevation = 16.dp,
            shape = RoundedCornerShape(radius),
            ambientColor = SassTextPrimary.copy(alpha = 0.08f),
            spotColor = SassTextPrimary.copy(alpha = 0.08f),
            clip = false
        )
        .background(SassCard, RoundedCornerShape(radius))
        
    if (onClick != null) {
        cardModifier = cardModifier.clickable(
            interactionSource = interactionSource,
            indication = ripple(color = SassTextPrimary.copy(alpha = 0.04f)),
            onClick = onClick
        )
    }

    Box(
        modifier = cardModifier.padding(24.dp)
    ) {
        Column {
            content()
        }
    }
}

@Composable
fun StatCard(
    title: String,
    metric: String,
    icon: ImageVector,
    iconBg: Color,
    iconColor: Color,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .shadow(
                elevation = 16.dp,
                shape = RoundedCornerShape(32.dp),
                ambientColor = SassTextPrimary.copy(alpha = 0.08f),
                spotColor = SassTextPrimary.copy(alpha = 0.08f),
                clip = false
            )
            .background(SassCard, RoundedCornerShape(32.dp))
            .padding(24.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(iconBg, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = iconColor,
                    modifier = Modifier.size(20.dp)
                )
            }
            
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = title,
                    color = SassTextSecondary,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = metric,
                    color = SassTextPrimary,
                    style = SassLargeNumber
                )
            }
        }
    }
}

@Composable
fun FintechChart(
    points: List<Float>,
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier) {
        val width = size.width
        val height = size.height
        
        if (points.size < 2) return@Canvas
        
        val maxVal = points.maxOrNull() ?: 1f
        val minVal = points.minOrNull() ?: 0f
        val range = if (maxVal - minVal == 0f) 1f else maxVal - minVal
        
        val path = Path()
        val fillPath = Path()
        val stepX = width / (points.size - 1)
        
        fun getY(value: Float): Float {
            val relativeVal = (value - minVal) / range
            return height - (relativeVal * height * 0.7f + height * 0.15f)
        }
        
        path.moveTo(0f, getY(points[0]))
        fillPath.moveTo(0f, height)
        fillPath.lineTo(0f, getY(points[0]))
        
        for (i in 1 until points.size) {
            val previousPointX = (i - 1) * stepX
            val previousPointY = getY(points[i - 1])
            val currentPointX = i * stepX
            val currentPointY = getY(points[i])
            
            val controlPointX1 = previousPointX + stepX / 2f
            val controlPointY1 = previousPointY
            val controlPointX2 = previousPointX + stepX / 2f
            val controlPointY2 = currentPointY
            
            path.cubicTo(
                controlPointX1, controlPointY1,
                controlPointX2, controlPointY2,
                currentPointX, currentPointY
            )
            
            fillPath.cubicTo(
                controlPointX1, controlPointY1,
                controlPointX2, controlPointY2,
                currentPointX, currentPointY
            )
        }
        
        fillPath.lineTo(width, height)
        fillPath.close()
        
        drawPath(
            path = fillPath,
            brush = Brush.verticalGradient(
                colors = listOf(
                    SassPrimary.copy(alpha = 0.2f),
                    SassPrimary.copy(alpha = 0.0f)
                ),
                startY = 0f,
                endY = height
            )
        )
        
        drawPath(
            path = path,
            color = SassPrimary,
            style = Stroke(
                width = 4.dp.toPx(),
                cap = StrokeCap.Round,
                join = StrokeJoin.Round
            )
        )
        
        for (i in points.indices) {
            val x = i * stepX
            val y = getY(points[i])
            drawCircle(
                color = SassAccent.copy(alpha = 0.4f),
                radius = 6.dp.toPx(),
                center = Offset(x, y)
            )
            drawCircle(
                color = Color.White,
                radius = 3.dp.toPx(),
                center = Offset(x, y)
            )
        }
    }
}

// ---------------- HOME SCREEN (COMMON) ----------------
@Composable
fun HomeScreen(
    data: JsonObject?,
    isSuperior: Boolean,
    isLoading: Boolean,
    capabilities: UserCapabilities, // passes parsed capabilities
    onOpenCrm: () -> Unit,
    onOpenAttendance: () -> Unit,
    onOpenSupport: () -> Unit,
    onOpenApprovals: () -> Unit,
    onOpenDocs: () -> Unit,
    onOpenStaff: () -> Unit,
    onOpenPayroll: () -> Unit,
    onOpenReviews: () -> Unit,
    onOpenAudit: () -> Unit,
    onOpenApplicants: () -> Unit,
    onOpenWorkOps: () -> Unit,
    onOpenExpenses: () -> Unit,
    onOpenReports: () -> Unit,
    onOpenAnnouncements: () -> Unit,
    onOpenMeetings: () -> Unit,
    onOpenResources: () -> Unit,
    onOpenPrivileges: () -> Unit,
    onOpenLeaves: () -> Unit,
    onSwitchToTasks: () -> Unit
) {
    val context = LocalContext.current
    val userName = NetworkClient.getUserName(context) ?: "User"
    val firstName = userName.substringBefore(" ").trim()

    val usersList = remember(data) { data?.get("users")?.jsonArray ?: JsonArray(emptyList()) }
    val onlineCount = remember(usersList) {
        usersList.count { it.jsonObject["isOnline"]?.jsonPrimitive?.booleanOrNull == true }
    }

    val tasks = remember(data) {
        data?.get("tasks")?.jsonArray ?: JsonArray(emptyList())
    }
    val openTasksCount = remember(tasks) {
        tasks.count { it.jsonObject["status"]?.jsonPrimitive?.contentOrNull != "Done" }
    }
    val completedTasksCount = remember(tasks) {
        tasks.count { it.jsonObject["status"]?.jsonPrimitive?.contentOrNull == "Done" }
    }

    val pendingCrmCount = remember(data) {
        data?.get("crmSheets")?.jsonArray?.count {
            val status = it.jsonObject["status"]?.jsonPrimitive?.contentOrNull
            status == "Pending" || status == "Draft"
        } ?: 0
    }
    val pendingLeavesCount = remember(data) {
        data?.get("leaveRequests")?.jsonArray?.count {
            it.jsonObject["status"]?.jsonPrimitive?.contentOrNull == "Pending"
        } ?: 0
    }
    val pendingExpensesCount = remember(data) {
        data?.get("expenses")?.jsonArray?.count {
            it.jsonObject["status"]?.jsonPrimitive?.contentOrNull == "Pending"
        } ?: 0
    }
    val pendingDocsCount = remember(data) {
        data?.get("documents")?.jsonArray?.count {
            val notes = it.jsonObject["notes"]?.jsonPrimitive?.contentOrNull ?: ""
            notes.contains("Pending")
        } ?: 0
    }

    // Dynamic Quick Actions based on role capabilities
    val caps = capabilities

    val activeActions = remember(caps) {
        val list = mutableListOf<QuickActionDef>()
        if (caps != null) {
            // 1. Attendance (Always Available)
            list.add(QuickActionDef("Attendance", Icons.Default.DateRange, Color(0xFFEFF6FF), SassPrimary, "attendance"))
            
            // 2. Tasks (Always Available)
            list.add(QuickActionDef("Tasks Board", Icons.Default.List, Color(0xFFEEF2F6), SassSecondary, "tasks"))
            
            // 3. CRM Leads (canUseCrm)
            if (caps.canUseCrm) {
                list.add(QuickActionDef("CRM Leads", Icons.Default.Search, Color(0xFFECFDF5), SassSuccess, "crm"))
            }
            
            // 4. Approvals
            if (caps.isSuperiorDashboard) {
                list.add(QuickActionDef("Review Approvals", Icons.Default.CheckCircle, Color(0xFFFEF2F2), SassDanger, "approvals"))
            }
            
            // 5. Leaves (Always shown for self-service)
            list.add(QuickActionDef("Leaves Log", Icons.Default.Check, Color(0xFFFDF4E7), SassWarning, "leaves"))
            
            // 6. Corporate Documents (canViewDocuments)
            if (caps.canViewDocuments) {
                list.add(QuickActionDef("Documents", Icons.Default.Info, Color(0xFFF5F3FF), SassSecondary, "documents"))
            }
            
            // 7. Support Room (canUseChat)
            if (caps.canUseChat) {
                list.add(QuickActionDef("Support Room", Icons.Default.Email, Color(0xFFE0F2FE), SassAccent, "support"))
            }
            
            // 8. Staff Directory (canViewEmployees || canManage)
            if (caps.canViewEmployees || caps.canManage) {
                list.add(QuickActionDef("Staff Directory", Icons.Default.AccountBox, Color(0xFFFFF1F2), Color(0xFFF43F5E), "staff"))
            }
            
            // 9. Payroll Hub (canManagePayroll / isSuperior)
            if (caps.canManagePayroll || caps.isSuperiorDashboard) {
                list.add(QuickActionDef("Payroll Hub", Icons.Default.ShoppingCart, Color(0xFFF0FDF4), SassSuccess, "payroll"))
            }
            
            // Performance Reviews card removed
            
            // 11. Audit Security Logs (canManageAccess)
            if (caps.canManageAccess) {
                list.add(QuickActionDef("Security Audits", Icons.Default.Warning, Color(0xFFFEF3C7), SassWarning, "audit"))
            }

            // 12. Applicants
            if (caps.canManageApplicants) {
                list.add(QuickActionDef("Applicants", Icons.Default.Person, Color(0xFFECFDF5), SassSuccess, "applicants"))
            }

            // 13. Work Ops
            if (caps.canManageOps || !caps.isSuperiorDashboard) {
                list.add(QuickActionDef("Work Ops", Icons.Default.Settings, Color(0xFFEFF6FF), SassPrimary, "ops"))
            }

            // 14. Expenses
            if (caps.canManageExpenses || !caps.isSuperiorDashboard) {
                list.add(QuickActionDef("Expenses", Icons.Default.ShoppingCart, Color(0xFFFDF4E7), SassWarning, "expenses"))
            }

            // 15. Reports
            if (caps.isSuperiorDashboard) {
                list.add(QuickActionDef("Reports", Icons.Default.List, Color(0xFFF5F3FF), SassSecondary, "reports"))
            }

            // 16. Announcements
            list.add(QuickActionDef("Announcements", Icons.Default.Notifications, Color(0xFFFFF1F2), Color(0xFFF43F5E), "announcements"))

            // 17. Meetings
            list.add(QuickActionDef("Meetings", Icons.Default.Call, Color(0xFFE0F2FE), SassAccent, "meetings"))

            // 18. Resources
            list.add(QuickActionDef("Resources", Icons.Default.Info, Color(0xFFEEF2F6), SassSecondary, "resources"))

            // 19. Privileges
            if (caps.canManageAccess) {
                list.add(QuickActionDef("Privileges", Icons.Default.Lock, Color(0xFFFEF3C7), SassWarning, "access"))
            }
        } else {
            // Fallback default modules
            list.add(QuickActionDef("Attendance", Icons.Default.DateRange, Color(0xFFEFF6FF), SassPrimary, "attendance"))
            list.add(QuickActionDef("Tasks", Icons.Default.List, Color(0xFFEEF2F6), SassSecondary, "tasks"))
            list.add(QuickActionDef("CRM Leads", Icons.Default.Search, Color(0xFFECFDF5), SassSuccess, "crm"))
            list.add(QuickActionDef("Leaves", Icons.Default.Check, Color(0xFFFDF4E7), SassWarning, "leaves"))
        }
        list
    }

    LazyColumn(
        contentPadding = PaddingValues(24.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        // Hero Section
        item {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(text = "Good Morning,", color = SassTextSecondary, style = SassBodyLarge)
                Text(text = firstName, color = SassTextPrimary, style = SassPageTitle, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = if (openTasksCount > 0) "$openTasksCount tasks require attention today." else "Everything is running smoothly.",
                    color = SassTextSecondary,
                    style = SassBodyLarge
                )
            }
        }

        // AI INSIGHTS CARD
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(
                        elevation = 16.dp,
                        shape = RoundedCornerShape(32.dp),
                        ambientColor = SassPrimary.copy(alpha = 0.25f),
                        spotColor = SassPrimary.copy(alpha = 0.25f),
                        clip = false
                    )
                    .background(
                        brush = Brush.linearGradient(colors = listOf(SassPrimary, SassSecondary)),
                        shape = RoundedCornerShape(32.dp)
                    )
                    .padding(24.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.Star, contentDescription = "AI Hub", tint = Color.White, modifier = Modifier.size(18.dp))
                        Text(text = "AI OPERATING SYSTEM", color = Color.White.copy(alpha = 0.8f), fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    }
                    Text(text = "Workspace Summary", color = Color.White, style = SassCardTitle)
                    
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (isSuperior) {
                            Text(text = "• $pendingCrmCount pending CRM implementation sheets", color = Color.White.copy(alpha = 0.9f), fontSize = 14.sp)
                            Text(text = "• $pendingLeavesCount leave requests awaiting approval", color = Color.White.copy(alpha = 0.9f), fontSize = 14.sp)
                            Text(text = "• $pendingExpensesCount expense claims awaiting review", color = Color.White.copy(alpha = 0.9f), fontSize = 14.sp)
                        } else {
                            Text(text = "• $openTasksCount active tasks assigned to you", color = Color.White.copy(alpha = 0.9f), fontSize = 14.sp)
                            Text(text = "• $pendingLeavesCount of your leave requests pending review", color = Color.White.copy(alpha = 0.9f), fontSize = 14.sp)
                            Text(text = "• $pendingExpensesCount of your expense claims pending payment", color = Color.White.copy(alpha = 0.9f), fontSize = 14.sp)
                        }
                    }
                    
                    HorizontalDivider(color = Color.White.copy(alpha = 0.15f))
                    
                    val recommendation = remember(pendingCrmCount, pendingLeavesCount, pendingExpensesCount, pendingDocsCount, openTasksCount, isSuperior) {
                        when {
                            pendingCrmCount > 0 && isSuperior -> "AI Recommendation: Prioritize reviewing the $pendingCrmCount pending CRM sheets to unblock client onboarding."
                            pendingLeavesCount > 0 && isSuperior -> "AI Recommendation: Address the $pendingLeavesCount pending employee leave requests to assist resource planning."
                            pendingDocsCount > 0 -> "AI Recommendation: Review and authorize outstanding contract agreements."
                            openTasksCount > 0 -> "AI Recommendation: Focus on completing your $openTasksCount active assigned tasks."
                            else -> "AI Recommendation: All workspace tasks are updated. Check internal announcements for corporate bulletins."
                        }
                    }
                    Text(
                        text = recommendation,
                        color = Color.White.copy(alpha = 0.95f),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }

        // 2x2 Statistics Grid (Total Employees, Team Online, Open Tasks, Completed Tasks)
        item {
            Column(
                verticalArrangement = Arrangement.spacedBy(20.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(20.dp)
                ) {
                    StatCard(
                        title = "Total Employees",
                        metric = "${usersList.size}",
                        icon = Icons.Default.AccountBox,
                        iconBg = Color(0xFFEFF6FF),
                        iconColor = SassPrimary,
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "Team Online",
                        metric = "$onlineCount",
                        icon = Icons.Default.CheckCircle,
                        iconBg = Color(0xFFECFDF5),
                        iconColor = SassSuccess,
                        modifier = Modifier.weight(1f)
                    )
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(20.dp)
                ) {
                    StatCard(
                        title = "Open Tasks",
                        metric = "$openTasksCount",
                        icon = Icons.Default.Warning,
                        iconBg = Color(0xFFFFF7ED),
                        iconColor = SassWarning,
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "Completed Tasks",
                        metric = "$completedTasksCount",
                        icon = Icons.Default.Check,
                        iconBg = Color(0xFFF5F3FF),
                        iconColor = SassSecondary,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // DYNAMIC QUICK ACTIONS GRID (Lists ALL allowed pages dynamically)
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(text = "Quick Access", style = SassSectionTitle, color = SassTextPrimary)
                
                val actionChunks = activeActions.chunked(2)
                actionChunks.forEach { rowItems ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        rowItems.forEach { action ->
                            HomeQuickActionCard(
                                title = action.title,
                                icon = action.icon,
                                iconColor = action.iconColor,
                                iconBg = action.iconBg,
                                onClick = {
                                    when (action.actionKey) {
                                        "attendance" -> onOpenAttendance()
                                        "tasks" -> onSwitchToTasks()
                                        "crm" -> onOpenCrm()
                                        "approvals" -> onOpenApprovals()
                                        "leaves" -> onOpenLeaves()
                                        "documents" -> onOpenDocs()
                                        "support" -> onOpenSupport()
                                        "staff" -> onOpenStaff()
                                        "payroll" -> onOpenPayroll()
                                        "reviews" -> onOpenReviews()
                                        "audit" -> onOpenAudit()
                                        "applicants" -> onOpenApplicants()
                                        "ops" -> onOpenWorkOps()
                                        "expenses" -> onOpenExpenses()
                                        "reports" -> onOpenReports()
                                        "announcements" -> onOpenAnnouncements()
                                        "meetings" -> onOpenMeetings()
                                        "resources" -> onOpenResources()
                                        "access" -> onOpenPrivileges()
                                    }
                                },
                                modifier = Modifier.weight(1f)
                            )
                        }
                        if (rowItems.size == 1) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        }

        // MY WORK
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(text = "My Work", style = SassSectionTitle, color = SassTextPrimary)
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    item {
                        MyWorkRowCard(
                            title = "Active Schools",
                            subtitle = "CRM Leads Sheets",
                            badgeText = "Realtime",
                            badgeColor = SassSuccess,
                            onClick = onOpenCrm
                        )
                    }
                    item {
                        MyWorkRowCard(
                            title = "Pending Approvals",
                            subtitle = "Leaves & Claims",
                            badgeText = "Review",
                            badgeColor = SassWarning,
                            onClick = onOpenApprovals
                        )
                    }
                    item {
                        MyWorkRowCard(
                            title = "Assigned Projects",
                            subtitle = "Kanban Tasks",
                            badgeText = "Sprint",
                            badgeColor = SassPrimary,
                            onClick = onSwitchToTasks
                        )
                    }
                }
            }
        }
    }
}

@Suppress("DEPRECATION")
@Composable
fun HomeQuickActionCard(
    title: String,
    icon: ImageVector,
    iconColor: Color,
    iconBg: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.96f else 1f,
        animationSpec = tween(durationMillis = 150)
    )

    Box(
        modifier = modifier
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .shadow(
                elevation = 8.dp,
                shape = RoundedCornerShape(24.dp),
                ambientColor = SassTextPrimary.copy(alpha = 0.05f),
                spotColor = SassTextPrimary.copy(alpha = 0.05f)
            )
            .background(SassCard, RoundedCornerShape(24.dp))
            .clickable(
                interactionSource = interactionSource,
                indication = ripple(color = SassPrimary.copy(alpha = 0.04f)),
                onClick = onClick
            )
            .padding(16.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(iconBg, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(imageVector = icon, contentDescription = title, tint = iconColor, modifier = Modifier.size(20.dp))
            }
            Text(
                text = title,
                color = SassTextPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Suppress("DEPRECATION")
@Composable
fun MyWorkRowCard(
    title: String,
    subtitle: String,
    badgeText: String,
    badgeColor: Color,
    onClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    Box(
        modifier = Modifier
            .width(200.dp)
            .shadow(
                elevation = 12.dp,
                shape = RoundedCornerShape(28.dp),
                ambientColor = SassTextPrimary.copy(alpha = 0.06f),
                spotColor = SassTextPrimary.copy(alpha = 0.06f)
            )
            .background(SassCard, RoundedCornerShape(28.dp))
            .clickable(
                interactionSource = interactionSource,
                indication = ripple(color = SassPrimary.copy(alpha = 0.04f)),
                onClick = onClick
            )
            .padding(20.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(
                modifier = Modifier
                    .background(badgeColor.copy(alpha = 0.12f), RoundedCornerShape(8.dp))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text(text = badgeText, color = badgeColor, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }
            Text(text = title, color = SassTextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(text = subtitle, color = SassTextSecondary, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

// ---------------- KANBAN TASKS SCREEN ----------------
@Composable
fun TasksScreen(
    data: JsonObject?,
    isLoading: Boolean,
    isSuperior: Boolean,
    onUpdateTaskStatus: (taskId: String, newStatus: String) -> Unit,
    onSaveTask: (
        id: String?,
        title: String,
        assignedTo: String?,
        ownerRole: String,
        priority: String,
        status: String,
        dueAt: String?,
        description: String?
    ) -> Unit
) {
    val tasks = remember(data) {
        data?.get("tasks")?.jsonArray ?: JsonArray(emptyList())
    }
    val usersList = remember(data) {
        data?.get("users")?.jsonArray ?: JsonArray(emptyList())
    }
    
    var selectedStage by remember { mutableStateOf(0) } // 0 = To Do, 1 = In Progress, 2 = Done
    var showCreateTaskDialog by remember { mutableStateOf(false) }

    var taskTitle by remember { mutableStateOf("") }
    var taskDesc by remember { mutableStateOf("") }
    var taskPriority by remember { mutableStateOf("Medium") }
    var taskAssignedTo by remember { mutableStateOf("") }
    var taskDueAt by remember { mutableStateOf("") }

    val filteredTasks = remember(tasks, selectedStage) {
        tasks.filter {
            val status = it.jsonObject["status"]?.jsonPrimitive?.contentOrNull ?: "Open"
            when (selectedStage) {
                0 -> status == "Open" || status == "Pending"
                1 -> status == "In Progress" || status == "Working"
                else -> status == "Done" || status == "Completed"
            }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp)
    ) {
        Spacer(modifier = Modifier.height(16.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = "Tasks Board", style = SassSectionTitle, color = SassTextPrimary)
            
            if (isSuperior) {
                IconButton(onClick = {
                    taskTitle = ""
                    taskDesc = ""
                    taskPriority = "Medium"
                    taskAssignedTo = ""
                    taskDueAt = ""
                    showCreateTaskDialog = true
                }) {
                    Icon(Icons.Default.AddCircle, contentDescription = "Add Task", tint = SassPrimary)
                }
            }
        }
        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .background(Color(0xFFF1F5F9), RoundedCornerShape(24.dp))
                .padding(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val stagesList = listOf("To Do", "Working", "Completed")
            stagesList.forEachIndexed { index, label ->
                val isSelected = selectedStage == index
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .shadow(
                            elevation = if (isSelected) 4.dp else 0.dp,
                            shape = RoundedCornerShape(20.dp),
                            clip = false
                        )
                        .background(if (isSelected) Color.White else Color.Transparent, RoundedCornerShape(20.dp))
                        .clickable { selectedStage = index },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = label,
                        color = if (isSelected) SassTextPrimary else SassTextSecondary,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        fontSize = 14.sp
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        if (filteredTasks.isEmpty()) {
            Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text(text = "No tasks in this stage.", color = SassTextSecondary, fontSize = 14.sp)
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentPadding = PaddingValues(bottom = 24.dp)
            ) {
                items(filteredTasks) { taskItem ->
                    val taskObj = taskItem.jsonObject
                    val taskId = taskObj["id"]?.jsonPrimitive?.contentOrNull ?: ""
                    val title = taskObj["title"]?.jsonPrimitive?.contentOrNull ?: "Task"
                    val description = taskObj["description"]?.jsonPrimitive?.contentOrNull ?: ""
                    val priority = taskObj["priority"]?.jsonPrimitive?.contentOrNull ?: "Medium"
                    val dueAt = taskObj["dueAt"]?.jsonPrimitive?.contentOrNull ?: "No due date"

                    val priorityColor = when (priority.lowercase()) {
                        "high" -> SassDanger
                        "medium" -> SassWarning
                        else -> SassSuccess
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(
                                elevation = 8.dp,
                                shape = RoundedCornerShape(28.dp),
                                ambientColor = SassTextPrimary.copy(alpha = 0.05f),
                                spotColor = SassTextPrimary.copy(alpha = 0.05f)
                            )
                            .background(SassCard, RoundedCornerShape(28.dp))
                            .padding(20.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Box(modifier = Modifier.size(8.dp).background(priorityColor, CircleShape))
                                    Text(
                                        text = "$priority Priority",
                                        color = priorityColor,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Text(
                                    text = "Due: ${dueAt.take(10)}",
                                    color = SassTextSecondary,
                                    fontSize = 11.sp
                                )
                            }
                            
                            Text(text = title, color = SassTextPrimary, style = SassCardTitle)
                            if (description.isNotEmpty()) {
                                Text(text = description, color = SassTextSecondary, fontSize = 14.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            }
                            
                            HorizontalDivider(color = Color(0x0F0F172A))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(text = "Move Stage", color = SassTextSecondary, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    if (selectedStage != 0) {
                                        Button(
                                            onClick = { onUpdateTaskStatus(taskId, "Open") },
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF1F5F9)),
                                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                            modifier = Modifier.height(32.dp),
                                            shape = RoundedCornerShape(12.dp)
                                        ) {
                                            Text("To Do", color = SassTextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    if (selectedStage != 1) {
                                        Button(
                                            onClick = { onUpdateTaskStatus(taskId, "In Progress") },
                                            colors = ButtonDefaults.buttonColors(containerColor = SassPrimary.copy(alpha = 0.1f)),
                                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                            modifier = Modifier.height(32.dp),
                                            shape = RoundedCornerShape(12.dp)
                                        ) {
                                            Text("Working", color = SassPrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    if (selectedStage != 2) {
                                        Button(
                                            onClick = { onUpdateTaskStatus(taskId, "Done") },
                                            colors = ButtonDefaults.buttonColors(containerColor = SassSuccess.copy(alpha = 0.1f)),
                                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                            modifier = Modifier.height(32.dp),
                                            shape = RoundedCornerShape(12.dp)
                                        ) {
                                            Text("Complete", color = SassSuccess, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showCreateTaskDialog && isSuperior) {
        AlertDialog(
            onDismissRequest = { showCreateTaskDialog = false },
            title = { Text(text = "Create Operations Task", style = SassCardTitle) },
            text = {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth().heightIn(max = 350.dp)
                ) {
                    item {
                        PremiumTextField(value = taskTitle, onValueChange = { taskTitle = it }, label = "Task Title", placeholder = "e.g. Update client credentials")
                    }
                    item {
                        PremiumTextField(value = taskDesc, onValueChange = { taskDesc = it }, label = "Description", placeholder = "Specify tasks details...")
                    }
                    item {
                        PremiumTextField(value = taskPriority, onValueChange = { taskPriority = it }, label = "Priority (Low / Medium / High)", placeholder = "Medium")
                    }
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("Assign Task to:", color = SassTextSecondary, fontSize = 12.sp)
                            PremiumTextField(value = taskAssignedTo, onValueChange = { taskAssignedTo = it }, label = "", placeholder = "e.g. Employee ID (e.g. 1)")
                            Text("Available Team Members:", color = SassTextSecondary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                            usersList.forEach { u ->
                                val user = u.jsonObject
                                Text("• ID ${user["id"]?.jsonPrimitive?.contentOrNull}: ${user["name"]?.jsonPrimitive?.contentOrNull}", color = SassTextSecondary, fontSize = 11.sp)
                            }
                        }
                    }
                    item {
                        PremiumTextField(value = taskDueAt, onValueChange = { taskDueAt = it }, label = "Due Date (YYYY-MM-DD)", placeholder = "2026-06-30")
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (taskTitle.isNotBlank()) {
                            onSaveTask(
                                null,
                                taskTitle,
                                taskAssignedTo.takeIf { it.isNotBlank() },
                                "employee",
                                taskPriority,
                                "Open",
                                taskDueAt.takeIf { it.isNotBlank() },
                                taskDesc.takeIf { it.isNotBlank() }
                            )
                            showCreateTaskDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SassPrimary),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Create Task", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showCreateTaskDialog = false }) {
                    Text("Cancel", color = SassTextSecondary)
                }
            },
            containerColor = SassCard,
            shape = RoundedCornerShape(28.dp)
        )
    }
}

// ---------------- AI ASSISTANT SCREEN ----------------
@Composable
fun AiAssistantScreen(data: JsonObject?) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val scope = rememberCoroutineScope()

    val chatMessages = remember { mutableStateListOf<Pair<String, String>>() }
    val inputMessage = remember { mutableStateOf("") }
    val isTyping = remember { mutableStateOf(false) }

    val crmSheets = remember(data) {
        data?.get("crmSheets")?.jsonArray
    }
    val meetings = remember(data) {
        data?.get("meetings")?.jsonArray
    }

    if (chatMessages.isEmpty()) {
        chatMessages.add(
            "ai" to "Hello Pareekshith, I am your workspace Copilot. How can I assist you with your operations today?"
        )
    }

    fun handleSend(text: String) {
        if (text.isBlank()) return
        chatMessages.add("user" to text)
        inputMessage.value = ""
        isTyping.value = true

        scope.launch {
            kotlinx.coroutines.delay(1000)
            isTyping.value = false

            val query = text.lowercase()
            when {
                query.contains("schools") || query.contains("crm") -> {
                    if (crmSheets != null && crmSheets.isNotEmpty()) {
                        var res = "Here are the active CRM implementation sheets found:\n"
                        crmSheets.forEach {
                            val sheet = it.jsonObject
                            val title = sheet["title"]?.jsonPrimitive?.contentOrNull ?: "Sheet"
                            val status = sheet["status"]?.jsonPrimitive?.contentOrNull ?: "Pending"
                            res += "\n• **$title** - Status: $status"
                        }
                        chatMessages.add("ai" to res)
                    } else {
                        chatMessages.add(
                            "ai" to "No active CRM implementations sheets were found."
                        )
                    }
                }
                query.contains("proposal") -> {
                    chatMessages.add(
                        "ai" to "### BLUEVOLT Smart LMS Proposal\n\n**To:** Ryan International School\n**Date:** June 12, 2026\n\nWe are pleased to propose the integration of the BlueVolt Enterprise LMS. Includes automated grading, parent app, and offline teacher sync portals.\n\n**Total Estimated Value:** ₹450,000"
                    )
                }
                query.contains("meetings") -> {
                    if (meetings != null && meetings.isNotEmpty()) {
                        var res = "Here are your scheduled meetings:\n"
                        meetings.forEach {
                            val meet = it.jsonObject
                            val title = meet["title"]?.jsonPrimitive?.contentOrNull ?: "Meeting"
                            val start = meet["startsAt"]?.jsonPrimitive?.contentOrNull ?: ""
                            res += "\n• **$title** at ${start.take(16).replace("T", " ")}"
                        }
                        chatMessages.add("ai" to res)
                    } else {
                        chatMessages.add(
                            "ai" to "You have no outstanding external meetings scheduled today. Your calendar is clear!"
                        )
                    }
                }
                query.contains("email") -> {
                    chatMessages.add(
                        "ai" to "Here is your drafted onboarding update email:\n\n**Subject:** BlueVolt LMS Training Session Confirmation\n\nDear Principal,\n\nI hope this email finds you well. This is to confirm our training session scheduled for tomorrow. We will set up credentials for all teachers.\n\nRegards,\nPareekshith"
                    )
                }
                query.contains("report") -> {
                    chatMessages.add(
                        "ai" to "### Work Activities Report\n\n• **LMS Software deployments:** 4 active\n• **CRM Revenue projection:** ₹4.8M\n• **Total Weekly Hours logged:** 32.5 hrs\n• **Tasks Completed this sprint:** 8"
                    )
                }
                else -> {
                    chatMessages.add(
                        "ai" to "I processed your request, but I'm in offline mock mode for custom text queries. Try clicking one of the template chips below for a richer interactive result!"
                    )
                }
            }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp)
    ) {
        Spacer(modifier = Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(Icons.Default.Star, contentDescription = "AI Assistant", tint = SassPrimary, modifier = Modifier.size(24.dp))
            Text(text = "BlueVolt Copilot", style = SassSectionTitle, color = SassTextPrimary)
        }
        Spacer(modifier = Modifier.height(16.dp))

        // Messages list
        LazyColumn(
            modifier = Modifier.weight(1f).fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(bottom = 16.dp)
        ) {
            items(chatMessages) { msg ->
                val isAi = msg.first == "ai"
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = if (isAi) Arrangement.Start else Arrangement.End
                ) {
                    Box(
                        modifier = Modifier
                            .widthIn(max = 280.dp)
                            .shadow(
                                elevation = if (isAi) 8.dp else 4.dp,
                                shape = RoundedCornerShape(
                                    topStart = 20.dp,
                                    topEnd = 20.dp,
                                    bottomStart = if (isAi) 4.dp else 20.dp,
                                    bottomEnd = if (isAi) 20.dp else 4.dp
                                )
                            )
                            .background(
                                color = if (isAi) SassCard else SassPrimary,
                                shape = RoundedCornerShape(
                                    topStart = 20.dp,
                                    topEnd = 20.dp,
                                    bottomStart = if (isAi) 4.dp else 20.dp,
                                    bottomEnd = if (isAi) 20.dp else 4.dp
                                )
                            )
                            .padding(16.dp)
                    ) {
                        Column {
                            Text(
                                text = msg.second,
                                color = if (isAi) SassTextPrimary else Color.White,
                                fontSize = 14.sp
                            )
                            if (isAi && msg.second.startsWith("###") || msg.second.contains("Subject:")) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Copy Draft",
                                    color = SassPrimary,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier
                                        .clickable {
                                            clipboardManager.setText(AnnotatedString(msg.second))
                                            Toast.makeText(context, "Copied to clipboard", Toast.LENGTH_SHORT).show()
                                        }
                                        .align(Alignment.End)
                                )
                            }
                        }
                    }
                }
            }

            if (isTyping.value) {
                item {
                    Box(
                        modifier = Modifier
                            .background(SassCard, RoundedCornerShape(16.dp))
                            .padding(12.dp)
                    ) {
                        Text(text = "Copilot is thinking...", color = SassTextSecondary, fontSize = 12.sp)
                    }
                }
            }
        }

        // Suggestion chips
        LazyRow(
            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            val templates = listOf(
                "Show pending schools",
                "Generate proposal",
                "Summarize meetings",
                "Draft emails",
                "Create reports"
            )
            items(templates) { item ->
                Box(
                    modifier = Modifier
                        .shadow(2.dp, RoundedCornerShape(16.dp))
                        .background(SassCard, RoundedCornerShape(16.dp))
                        .clickable { handleSend(item) }
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Text(text = item, color = SassPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Input field
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            BasicTextField(
                value = inputMessage.value,
                onValueChange = { inputMessage.value = it },
                textStyle = TextStyle(color = SassTextPrimary, fontSize = 15.sp),
                singleLine = true,
                modifier = Modifier.weight(1f),
                decorationBox = { innerTextField ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(54.dp)
                            .background(Color(0xFFF1F5F9), RoundedCornerShape(20.dp))
                            .padding(horizontal = 20.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(modifier = Modifier.weight(1f)) {
                            if (inputMessage.value.isEmpty()) {
                                Text(
                                    text = "Ask Copilot anything...",
                                    color = SassTextSecondary.copy(alpha = 0.6f),
                                    fontSize = 15.sp
                                )
                            }
                            innerTextField()
                        }
                    }
                }
            )

            Box(
                modifier = Modifier
                    .size(54.dp)
                    .background(
                        brush = Brush.linearGradient(colors = listOf(SassPrimary, SassSecondary)),
                        shape = CircleShape
                    )
                    .clickable { handleSend(inputMessage.value) },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Send, contentDescription = "Send", tint = Color.White, modifier = Modifier.size(20.dp))
            }
        }
    }
}

// ---------------- NOTIFICATIONS SCREEN ----------------
@Composable
fun NotificationsScreen(data: JsonObject?) {
    val notifications = remember(data) {
        data?.get("notifications")?.jsonArray ?: JsonArray(emptyList())
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp)
    ) {
        Spacer(modifier = Modifier.height(16.dp))
        Text(text = "Inbox Notifications", style = SassSectionTitle, color = SassTextPrimary)
        Spacer(modifier = Modifier.height(16.dp))

        if (notifications.isEmpty()) {
            Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text(text = "You are all caught up.", color = SassTextSecondary, fontSize = 14.sp)
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentPadding = PaddingValues(bottom = 24.dp)
            ) {
                items(notifications) { noticeItem ->
                    val notice = noticeItem.jsonObject
                    val title = notice["title"]?.jsonPrimitive?.contentOrNull ?: "Notification"
                    val desc = notice["body"]?.jsonPrimitive?.contentOrNull ?: ""
                    val time = notice["createdAt"]?.jsonPrimitive?.contentOrNull ?: ""

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(
                                elevation = 8.dp,
                                shape = RoundedCornerShape(24.dp),
                                ambientColor = SassTextPrimary.copy(alpha = 0.05f),
                                spotColor = SassTextPrimary.copy(alpha = 0.05f)
                            )
                            .background(SassCard, RoundedCornerShape(24.dp))
                            .padding(20.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(text = title, color = SassTextPrimary, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                                Text(text = time.take(10), color = SassTextSecondary, fontSize = 11.sp)
                            }
                            if (desc.isNotEmpty()) {
                                Text(text = desc, color = SassTextSecondary, fontSize = 13.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ---------------- PROFILE SCREEN ----------------
@Composable
fun ProfileScreen(
    data: JsonObject?,
    onLogout: () -> Unit,
    onOpenDocs: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val userName = NetworkClient.getUserName(context) ?: "User"
    val userEmail = NetworkClient.getUserEmail(context) ?: ""
    val userRole = NetworkClient.getUserRole(context) ?: ""

    val payrollInputs = remember(data) { data?.get("payrollInputs")?.jsonArray ?: JsonArray(emptyList()) }
    val reviews = remember(data) { data?.get("reviews")?.jsonArray ?: JsonArray(emptyList()) }
    val leaveRequests = remember(data) { data?.get("leaveRequests")?.jsonArray ?: JsonArray(emptyList()) }
    val documents = remember(data) { data?.get("documents")?.jsonArray ?: JsonArray(emptyList()) }

    var isPayrollExpanded by remember { mutableStateOf(false) }

    val currentUser = remember(data) {
        val usersList = data?.get("users")?.jsonArray
        val sessionObj = data?.get("session")?.jsonObject
        val sessionId = sessionObj?.get("id")?.jsonPrimitive?.intOrNull
        usersList?.firstOrNull { it.jsonObject["id"]?.jsonPrimitive?.intOrNull == sessionId }?.jsonObject
    }
    val currentUserId = remember(currentUser) {
        currentUser?.get("id")?.jsonPrimitive?.intOrNull
    }

    val leaveBalance = remember(leaveRequests, currentUserId) {
        if (currentUserId == null) 24
        else {
            var taken = 0
            leaveRequests.forEach { item ->
                val obj = item.jsonObject
                val empId = obj["employeeId"]?.jsonPrimitive?.intOrNull
                val status = obj["status"]?.jsonPrimitive?.contentOrNull
                if (empId == currentUserId && status == "Approved") {
                    val start = obj["startsAt"]?.jsonPrimitive?.contentOrNull
                    val end = obj["endsAt"]?.jsonPrimitive?.contentOrNull
                    taken += calculateLeaveDays(start, end)
                }
            }
            maxOf(0, 24 - taken)
        }
    }

    val perfScore = remember(reviews, currentUserId) {
        if (currentUserId == null) "10/10"
        else {
            val myReviews = reviews.filter {
                it.jsonObject["employeeId"]?.jsonPrimitive?.intOrNull == currentUserId
            }
            val firstReview = myReviews.firstOrNull()?.jsonObject
            val score = firstReview?.get("score")?.jsonPrimitive?.doubleOrNull 
                ?: firstReview?.get("rating")?.jsonPrimitive?.doubleOrNull
            if (score != null) {
                String.format(Locale.US, "%.1f/10", score)
            } else {
                if (myReviews.isEmpty()) "10/10" else "N/A"
            }
        }
    }

    val deviceAsset = remember(documents, currentUser) {
        val assetDoc = documents.firstOrNull {
            val title = it.jsonObject["title"]?.jsonPrimitive?.contentOrNull?.lowercase(Locale.US) ?: ""
            title.contains("laptop") || title.contains("device") || title.contains("macbook") || 
                    title.contains("thinkpad") || title.contains("computer") || title.contains("asset")
        }?.jsonObject
        if (assetDoc != null) {
            assetDoc["title"]?.jsonPrimitive?.contentOrNull ?: "MacBook Pro"
        } else {
            val dept = currentUser?.get("department")?.jsonPrimitive?.contentOrNull?.lowercase(Locale.US) ?: ""
            if (dept.contains("engineering") || dept.contains("product") || dept.contains("content") || dept.contains("tech") || dept.contains("design")) {
                "MacBook Pro"
            } else {
                "ThinkPad L14"
            }
        }
    }

    val managerName = remember(data, currentUser) {
        val managerId = currentUser?.get("managerId")?.jsonPrimitive?.intOrNull
        val usersList = data?.get("users")?.jsonArray
        val mgrObj = if (managerId != null && usersList != null) {
            usersList.firstOrNull { it.jsonObject["id"]?.jsonPrimitive?.intOrNull == managerId }?.jsonObject
        } else null
        mgrObj?.get("name")?.jsonPrimitive?.contentOrNull ?: "Arjun Prasad"
    }

    val deptName = remember(currentUser) {
        currentUser?.get("department")?.jsonPrimitive?.contentOrNull ?: "General"
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(24.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Avatar circle
        item {
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .background(
                        brush = Brush.linearGradient(colors = listOf(SassPrimary, SassSecondary)),
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = userName.take(1).uppercase(),
                    color = Color.White,
                    fontSize = 38.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        item {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(text = userName, color = SassTextPrimary, style = SassSectionTitle)
                Text(text = userEmail, color = SassTextSecondary, fontSize = 14.sp)
            }
        }

        // Stats metrics
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                ProfileMetricItem(
                    label = "Perf Score",
                    value = perfScore,
                    modifier = Modifier.weight(1f)
                )
                ProfileMetricItem(
                    label = "Leave Bal",
                    value = "$leaveBalance Days",
                    modifier = Modifier.weight(1f)
                )
                ProfileMetricItem(
                    label = "Device Asset",
                    value = deviceAsset,
                    modifier = Modifier.weight(1.2f)
                )
            }
        }

        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(
                        elevation = 8.dp,
                        shape = RoundedCornerShape(28.dp),
                        ambientColor = SassTextPrimary.copy(alpha = 0.05f),
                        spotColor = SassTextPrimary.copy(alpha = 0.05f)
                    )
                    .background(SassCard, RoundedCornerShape(28.dp))
                    .padding(20.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    ProfileField("Portal Role", userRole.replace("_", " ").uppercase())
                    HorizontalDivider(color = Color(0x0F0F172A))
                    ProfileField("Department", deptName)
                    HorizontalDivider(color = Color(0x0F0F172A))
                    ProfileField("Manager Name", managerName)
                }
            }
        }

        item {
            val currentUserId = remember(data) { data?.get("session")?.jsonObject?.get("userId")?.jsonPrimitive?.contentOrNull ?: "" }
            
            Column(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                Button(
                    onClick = onOpenDocs,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEFF6FF)),
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(18.dp)
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Info, contentDescription = "Docs", tint = SassPrimary)
                        Text("Access Corporate Documents & Letters", color = SassPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Button(
                        onClick = {
                            if (currentUserId.isNotEmpty()) {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://bluevolt.group/api/employee/id-card?employeeId=$currentUserId"))
                                context.startActivity(intent)
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFECFDF5)),
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier.weight(1f).height(50.dp)
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.AccountBox, contentDescription = "ID Card", tint = SassSuccess, modifier = Modifier.size(16.dp))
                            Text("Open ID Card", color = SassSuccess, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                    
                    Button(
                        onClick = {
                            if (currentUserId.isNotEmpty()) {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://bluevolt.group/api/employee/letter?employeeId=$currentUserId"))
                                context.startActivity(intent)
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFF7ED)),
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier.weight(1f).height(50.dp)
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Email, contentDescription = "Letter", tint = SassWarning, modifier = Modifier.size(16.dp))
                            Text("View Letter", color = SassWarning, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }
            }
        }

        item {
            var isSecurityExpanded by remember { mutableStateOf(false) }
            var currentPassword by remember { mutableStateOf("") }
            var newPassword by remember { mutableStateOf("") }
            var confirmPassword by remember { mutableStateOf("") }
            
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(
                        elevation = 8.dp,
                        shape = RoundedCornerShape(28.dp),
                        ambientColor = SassTextPrimary.copy(alpha = 0.05f),
                        spotColor = SassTextPrimary.copy(alpha = 0.05f)
                    )
                    .background(SassCard, RoundedCornerShape(28.dp))
                    .clickable { isSecurityExpanded = !isSecurityExpanded }
                    .padding(20.dp)
            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.Lock, contentDescription = "Security", tint = SassPrimary, modifier = Modifier.size(20.dp))
                            Text(text = "Security & Credentials", style = SassCardTitle, color = SassTextPrimary)
                        }
                        Icon(
                            imageVector = if (isSecurityExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                            contentDescription = "Expand",
                            tint = SassTextSecondary
                        )
                    }

                    if (isSecurityExpanded) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Column(
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxWidth().clickable(enabled = false) {}
                        ) {
                            PremiumTextField(
                                value = currentPassword,
                                onValueChange = { currentPassword = it },
                                label = "Current Password",
                                placeholder = "••••••••",
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
                            )
                            PremiumTextField(
                                value = newPassword,
                                onValueChange = { newPassword = it },
                                label = "New Password",
                                placeholder = "••••••••",
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
                            )
                            PremiumTextField(
                                value = confirmPassword,
                                onValueChange = { confirmPassword = it },
                                label = "Confirm New Password",
                                placeholder = "••••••••",
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
                            )
                            
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(
                                onClick = {
                                    if (currentPassword.isNotEmpty() && newPassword.isNotEmpty() && confirmPassword.isNotEmpty()) {
                                        scope.launch {
                                            NetworkClient.changeEmployeePassword(context, currentPassword, newPassword, confirmPassword).fold(
                                                onSuccess = {
                                                    Toast.makeText(context, "Password updated successfully!", Toast.LENGTH_SHORT).show()
                                                    currentPassword = ""
                                                    newPassword = ""
                                                    confirmPassword = ""
                                                    isSecurityExpanded = false
                                                },
                                                onFailure = {
                                                    Toast.makeText(context, "Failed: ${it.message}", Toast.LENGTH_LONG).show()
                                                }
                                            )
                                        }
                                    } else {
                                        Toast.makeText(context, "Please fill out all fields", Toast.LENGTH_SHORT).show()
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = SassPrimary),
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth().height(48.dp)
                            ) {
                                Text("Update Password", color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }

        // Expandable Payroll
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(
                        elevation = 8.dp,
                        shape = RoundedCornerShape(28.dp),
                        ambientColor = SassTextPrimary.copy(alpha = 0.05f),
                        spotColor = SassTextPrimary.copy(alpha = 0.05f)
                    )
                    .background(SassCard, RoundedCornerShape(28.dp))
                    .clickable { isPayrollExpanded = !isPayrollExpanded }
                    .padding(20.dp)
            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = "Payroll History", style = SassCardTitle, color = SassTextPrimary)
                        Icon(
                            imageVector = if (isPayrollExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                            contentDescription = "Expand",
                            tint = SassTextSecondary
                        )
                    }

                    if (isPayrollExpanded) {
                        Spacer(modifier = Modifier.height(16.dp))
                        if (payrollInputs.isEmpty()) {
                            Text(text = "No payroll records found.", color = SassTextSecondary, fontSize = 14.sp)
                        } else {
                            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                payrollInputs.forEach { pay ->
                                    val payObj = pay.jsonObject
                                    val month = payObj["payMonth"]?.jsonPrimitive?.contentOrNull ?: "Month"
                                    val amount = payObj["baseSalary"]?.jsonPrimitive?.contentOrNull ?: "0"
                                    val status = payObj["status"]?.jsonPrimitive?.contentOrNull ?: "Pending"
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text(text = month, color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                            Text(text = "Base: ₹$amount", color = SassTextSecondary, fontSize = 12.sp)
                                        }
                                        Text(text = status, color = if (status == "Paid") SassSuccess else SassWarning, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    }
                                    HorizontalDivider(color = Color(0x0F0F172A))
                                }
                            }
                        }
                    }
                }
            }
        }


        // Logout
        item {
            Spacer(modifier = Modifier.height(12.dp))
            Button(
                onClick = onLogout,
                colors = ButtonDefaults.buttonColors(containerColor = SassDanger),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.fillMaxWidth().height(52.dp)
            ) {
                Text(text = "LOG OUT WORKSPACE", color = Color.White, fontWeight = FontWeight.Bold)
            }
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
fun ProfileMetricItem(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .shadow(4.dp, RoundedCornerShape(20.dp))
            .background(SassCard, RoundedCornerShape(20.dp))
            .padding(12.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(text = label, color = SassTextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Medium)
            Text(text = value, color = SassPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
fun ProfileField(label: String, value: String) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(text = label, color = SassTextSecondary, fontSize = 12.sp)
        Text(text = value, color = SassTextPrimary, fontSize = 15.sp, fontWeight = FontWeight.Bold)
    }
}

// ---------------- CRM OVERLAY SCREEN ----------------
@Composable
fun CrmOverlayScreen(
    data: JsonObject?,
    canManageCrmSheets: Boolean,
    onClose: () -> Unit,
    onImportSheet: (title: String, pasteData: String) -> Unit,
    onUpdateRowStatus: (rowId: String, status: String, reason: String?) -> Unit
) {
    val sheets = remember(data) {
        data?.get("crmSheets")?.jsonArray ?: JsonArray(emptyList())
    }
    
    var showImportDialog by remember { mutableStateOf(false) }
    var selectedSheet by remember { mutableStateOf<JsonObject?>(null) }
    var editingRow by remember { mutableStateOf<JsonObject?>(null) }
    
    var rowStatus by remember { mutableStateOf("Open") }
    var rowReason by remember { mutableStateOf("") }

    Column(
        modifier = Modifier.fillMaxSize().background(SassBackground)
    ) {
        if (selectedSheet == null) {
            Row(
                modifier = Modifier.fillMaxWidth().background(SassCard).padding(horizontal = 12.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onClose) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = SassTextPrimary)
                }
                Text(text = "CRM Leads Sheets", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.weight(1f))
                
                if (canManageCrmSheets) {
                    IconButton(onClick = { showImportDialog = true }) {
                        Icon(Icons.Default.AddCircle, contentDescription = "Import leads", tint = SassPrimary)
                    }
                }
            }

            if (sheets.isEmpty()) {
                Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Text(text = "No active CRM sheets.", color = SassTextSecondary, fontSize = 14.sp)
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.weight(1f).fillMaxWidth()
                ) {
                    items(sheets) { sheet ->
                        val obj = sheet.jsonObject
                        val title = obj["title"]?.jsonPrimitive?.contentOrNull ?: "CRM Sheet"
                        val status = obj["status"]?.jsonPrimitive?.contentOrNull ?: "Pending"
                        val rows = obj["rows"]?.jsonArray ?: JsonArray(emptyList())
                        val doneCount = rows.count { it.jsonObject["status"]?.jsonPrimitive?.contentOrNull == "Done" }
                        
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .shadow(
                                    elevation = 8.dp,
                                    shape = RoundedCornerShape(28.dp),
                                    ambientColor = SassTextPrimary.copy(alpha = 0.05f),
                                    spotColor = SassTextPrimary.copy(alpha = 0.05f)
                                )
                                .background(SassCard, RoundedCornerShape(28.dp))
                                .clickable { selectedSheet = obj }
                                .padding(20.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = title,
                                        color = SassTextPrimary,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 16.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(text = "${rows.size} leads • $doneCount completed", color = SassTextSecondary, fontSize = 13.sp)
                                }
                                Box(
                                    modifier = Modifier
                                        .background(
                                            color = if (status == "Approved") Color(0xFFECFDF5) else Color(0xFFFFF7ED),
                                            shape = RoundedCornerShape(12.dp)
                                        )
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = status,
                                        color = if (status == "Approved") SassSuccess else SassWarning,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            }
        } else {
            val sheetObj = selectedSheet!!
            val sheetTitle = sheetObj["title"]?.jsonPrimitive?.contentOrNull ?: "CRM Sheet"
            val rows = sheetObj["rows"]?.jsonArray ?: JsonArray(emptyList())
            val columns = sheetObj["columns"]?.jsonArray ?: JsonArray(emptyList())
            
            Row(
                modifier = Modifier.fillMaxWidth().background(SassCard).padding(horizontal = 12.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { selectedSheet = null }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = SassTextPrimary)
                }
                Text(text = sheetTitle, color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            
            if (rows.isEmpty()) {
                Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Text(text = "No leads in this sheet.", color = SassTextSecondary, fontSize = 14.sp)
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.weight(1f).fillMaxWidth()
                ) {
                    items(rows) { rowItem ->
                        val rowObj = rowItem.jsonObject
                        val rowId = rowObj["id"]?.jsonPrimitive?.contentOrNull ?: ""
                        val rowNum = rowObj["rowNumber"]?.jsonPrimitive?.intOrNull ?: 1
                        val status = rowObj["status"]?.jsonPrimitive?.contentOrNull ?: "Open"
                        val reason = rowObj["reason"]?.jsonPrimitive?.contentOrNull ?: ""
                        val cellData = rowObj["data"]?.jsonObject
                        
                        val previewFields = mutableListOf<Pair<String, String>>()
                        columns.forEach { col ->
                            val colName = col.jsonPrimitive.content
                            val value = cellData?.get(colName)?.jsonPrimitive?.contentOrNull ?: ""
                            if (value.isNotEmpty() && previewFields.size < 3) {
                                previewFields.add(colName to value)
                            }
                        }
                        
                        val statusColor = when (status) {
                            "Done" -> SassSuccess
                            "Callback" -> SassWarning
                            "Not Interested" -> SassDanger
                            "Invalid" -> SassTextSecondary
                            else -> SassPrimary
                        }
                        
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .shadow(8.dp, RoundedCornerShape(24.dp))
                                .background(SassCard, RoundedCornerShape(24.dp))
                                .clickable {
                                    rowStatus = status
                                    rowReason = reason
                                    editingRow = rowObj
                                }
                                .padding(20.dp)
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(text = "Lead #${rowNum + 1}", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    Box(
                                        modifier = Modifier
                                            .background(statusColor.copy(alpha = 0.12f), RoundedCornerShape(8.dp))
                                            .padding(horizontal = 8.dp, vertical = 4.dp)
                                    ) {
                                        Text(text = status, color = statusColor, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                                
                                previewFields.forEach { (k, v) ->
                                    Row(modifier = Modifier.fillMaxWidth()) {
                                        Text(text = "$k: ", color = SassTextSecondary, fontSize = 13.sp, fontWeight = FontWeight.Medium, modifier = Modifier.width(96.dp))
                                        Text(text = v, color = SassTextPrimary, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    }
                                }
                                
                                if (reason.isNotEmpty()) {
                                    HorizontalDivider(color = Color(0x0F0F172A))
                                    Text(text = "Outcome Note: $reason", color = SassTextSecondary, fontSize = 12.sp)
                                }
                                
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Tap to update status or comment",
                                    color = SassPrimary,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.align(Alignment.End)
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showImportDialog) {
        var sheetTitle by remember { mutableStateOf("") }
        var pasteData by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showImportDialog = false },
            title = { Text(text = "Import CSV Leads Sheet", style = SassCardTitle) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(text = "Specify sheet details and paste tab-separated or comma-separated CSV rows with headers (e.g. Company, Contact, Email, Phone):", color = SassTextSecondary, fontSize = 13.sp)
                    PremiumTextField(value = sheetTitle, onValueChange = { sheetTitle = it }, label = "Sheet Title", placeholder = "e.g. Pune Schools Onboarding")
                    PremiumTextField(value = pasteData, onValueChange = { pasteData = it }, label = "Paste CSV / TSV Rows", placeholder = "Company,Contact,Email,Phone\nBlueVolt,John,john@bluevolt.group,9876543210")
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (sheetTitle.isNotBlank() && pasteData.isNotBlank()) {
                            onImportSheet(sheetTitle, pasteData)
                            showImportDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SassPrimary),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Import Sheet", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showImportDialog = false }) {
                    Text("Cancel", color = SassTextSecondary)
                }
            },
            containerColor = SassCard,
            shape = RoundedCornerShape(28.dp)
        )
    }

    if (editingRow != null) {
        val rowObj = editingRow!!
        val rowId = rowObj["id"]?.jsonPrimitive?.contentOrNull ?: ""
        val rowNum = rowObj["rowNumber"]?.jsonPrimitive?.intOrNull ?: 1
        
        AlertDialog(
            onDismissRequest = { editingRow = null },
            title = { Text(text = "Update Lead Outcome #${rowNum + 1}", style = SassCardTitle) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Select current status outcome:", color = SassTextSecondary, fontSize = 13.sp)
                    
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("Open", "Callback", "Done", "Not Interested", "Invalid").chunked(3).forEach { chunk ->
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                chunk.forEach { s ->
                                    val isSelected = rowStatus == s
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .border(
                                                width = 1.dp,
                                                color = if (isSelected) SassPrimary else Color(0x1F0F172A),
                                                shape = RoundedCornerShape(12.dp)
                                            )
                                            .background(
                                                color = if (isSelected) SassPrimary.copy(alpha = 0.08f) else Color.Transparent,
                                                shape = RoundedCornerShape(12.dp)
                                            )
                                            .clickable { rowStatus = s }
                                            .padding(vertical = 10.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = s,
                                            color = if (isSelected) SassPrimary else SassTextPrimary,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                                if (chunk.size < 3) {
                                    Spacer(modifier = Modifier.weight((3 - chunk.size).toFloat()))
                                }
                            }
                        }
                    }
                    
                    PremiumTextField(
                        value = rowReason,
                        onValueChange = { rowReason = it },
                        label = "Outcome Comment / Notes",
                        placeholder = "e.g. Call scheduled for Monday 10am"
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onUpdateRowStatus(rowId, rowStatus, rowReason.takeIf { it.isNotBlank() })
                        editingRow = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SassPrimary),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Save Outcome", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { editingRow = null }) {
                    Text("Cancel", color = SassTextSecondary)
                }
            },
            containerColor = SassCard,
            shape = RoundedCornerShape(28.dp)
        )
    }
}

// ---------------- ATTENDANCE OVERLAY SCREEN ----------------
@Composable
fun AttendanceOverlayScreen(
    data: JsonObject?,
    isClockedIn: Boolean,
    clockInTime: String?,
    isLoading: Boolean,
    onClose: () -> Unit,
    onClockIn: () -> Unit,
    onClockOut: () -> Unit
) {
    val attendanceList = remember(data) { data?.get("attendance")?.jsonArray ?: JsonArray(emptyList()) }
    
    val todayHours = remember(isClockedIn, clockInTime) {
        if (isClockedIn && clockInTime != null) {
            val loginDate = parseIsoDateTime(clockInTime)
            if (loginDate != null) {
                (System.currentTimeMillis() - loginDate.time).toDouble() / (1000 * 60 * 60)
            } else 0.0
        } else 0.0
    }

    val weeklyHours = remember(attendanceList, todayHours) {
        var total = 0.0
        attendanceList.forEach {
            val hours = it.jsonObject["totalHours"]?.jsonPrimitive?.doubleOrNull ?: 0.0
            total += hours
        }
        total + todayHours
    }

    val chartPoints = remember(attendanceList, todayHours) {
        val points = mutableListOf<Float>()
        val lastEntries = attendanceList.take(7).reversed()
        lastEntries.forEach {
            val h = it.jsonObject["totalHours"]?.jsonPrimitive?.doubleOrNull ?: 0.0
            points.add(h.toFloat())
        }
        if (isClockedIn) {
            points.add(todayHours.toFloat())
        }
        if (points.size < 2) {
            listOf(0f, 0f, todayHours.toFloat())
        } else {
            points
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().background(SassBackground)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().background(SassCard).padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onClose) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = SassTextPrimary)
            }
            Text(text = "Attendance Tracker", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }

        LazyColumn(
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
            modifier = Modifier.weight(1f).fillMaxWidth()
        ) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(12.dp, RoundedCornerShape(28.dp))
                        .background(SassCard, RoundedCornerShape(28.dp))
                        .padding(24.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Box(modifier = Modifier.size(10.dp).background(if (isClockedIn) SassSuccess else SassTextSecondary, CircleShape))
                            Text(
                                text = if (isClockedIn) "Status: Shift Active" else "Status: Inactive",
                                color = if (isClockedIn) SassSuccess else SassTextSecondary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                        }

                        if (isClockedIn) {
                            Text(text = "Logged in since: ${clockInTime?.take(16)?.replace("T", " ")}", color = SassTextSecondary, fontSize = 14.sp)
                            Button(
                                onClick = onClockOut,
                                colors = ButtonDefaults.buttonColors(containerColor = SassDanger),
                                shape = RoundedCornerShape(18.dp),
                                modifier = Modifier.fillMaxWidth().height(54.dp),
                                enabled = !isLoading
                            ) {
                                Text("CLOCK OUT OF SHIFT", color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        } else {
                            Text(text = "Ready to start your working hours?", color = SassTextSecondary, fontSize = 14.sp)
                            Button(
                                onClick = onClockIn,
                                colors = ButtonDefaults.buttonColors(containerColor = SassPrimary),
                                shape = RoundedCornerShape(18.dp),
                                modifier = Modifier.fillMaxWidth().height(54.dp),
                                enabled = !isLoading
                            ) {
                                Text("CLOCK IN FOR TODAY", color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    ProfileMetricItem(
                        label = "Today's Hours",
                        value = "${todayHours.format(1)} hrs",
                        modifier = Modifier.weight(1f)
                    )
                    ProfileMetricItem(
                        label = "Weekly Hours",
                        value = "${weeklyHours.format(1)} hrs",
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(16.dp, RoundedCornerShape(28.dp))
                        .background(SassCard, RoundedCornerShape(28.dp))
                        .padding(24.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Text(text = "Weekly Activity index", color = SassTextPrimary, style = SassCardTitle)
                        FintechChart(
                            points = chartPoints,
                            modifier = Modifier.fillMaxWidth().height(160.dp)
                        )
                    }
                }
            }

            item {
                Text(text = "Check-in History", style = SassSectionTitle, color = SassTextPrimary)
            }

            if (attendanceList.isEmpty()) {
                item {
                    Text(text = "No check-in history found.", color = SassTextSecondary, fontSize = 14.sp)
                }
            } else {
                items(attendanceList) { attItem ->
                    val obj = attItem.jsonObject
                    val date = obj["workDate"]?.jsonPrimitive?.contentOrNull ?: ""
                    val login = obj["loginAt"]?.jsonPrimitive?.contentOrNull ?: ""
                    val logout = obj["logoutAt"]?.jsonPrimitive?.contentOrNull
                    val status = obj["status"]?.jsonPrimitive?.contentOrNull ?: "Present"
                    val hours = obj["totalHours"]?.jsonPrimitive?.doubleOrNull ?: 0.0

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(8.dp, RoundedCornerShape(24.dp))
                            .background(SassCard, RoundedCornerShape(24.dp))
                            .padding(20.dp)
                    ) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column {
                                Text(text = date, color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                Text(
                                    text = if (logout != null) {
                                        "In: ${login.take(16).replace("T", " ")} | Out: ${logout.take(16).replace("T", " ")}"
                                    } else {
                                        "In: ${login.take(16).replace("T", " ")} | Active Shift"
                                    },
                                    color = SassTextSecondary,
                                    fontSize = 13.sp
                                )
                                Text(text = "Hours worked: ${hours.format(2)} hrs", color = SassTextSecondary, fontSize = 12.sp)
                            }
                            Text(
                                text = status,
                                color = when (status) {
                                    "Present" -> SassSuccess
                                    "Half-day" -> SassWarning
                                    "Absent" -> SassDanger
                                    else -> SassWarning
                                },
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

// ---------------- APPROVALS OVERLAY SCREEN (MANAGERS) ----------------
@Composable
fun ApprovalsOverlayScreen(
    data: JsonObject?,
    canManageExpenses: Boolean,
    onClose: () -> Unit,
    onAction: (entity: String, id: String, newStatus: String) -> Unit
) {
    val leaves = remember(data) { data?.get("leaveRequests")?.jsonArray ?: JsonArray(emptyList()) }
    val expenses = remember(data) { data?.get("expenses")?.jsonArray ?: JsonArray(emptyList()) }
    val crmSheets = remember(data) { data?.get("crmSheets")?.jsonArray ?: JsonArray(emptyList()) }
    val documents = remember(data) { data?.get("documents")?.jsonArray ?: JsonArray(emptyList()) }
    val applicants = remember(data) { data?.get("applicants")?.jsonArray ?: JsonArray(emptyList()) }

    var selectedSection by remember { mutableStateOf(0) }

    Column(
        modifier = Modifier.fillMaxSize().background(SassBackground)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().background(SassCard).padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onClose) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = SassTextPrimary)
            }
            Text(text = "Review Approvals", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 12.dp)
                .height(48.dp)
                .background(Color(0xFFF1F5F9), RoundedCornerShape(24.dp))
                .padding(4.dp)
                .horizontalScroll(rememberScrollState()),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val tabs = listOf("Leaves", "Expenses", "CRM Sheets", "Documents", "Applicants")
            tabs.forEachIndexed { index, label ->
                val isSel = selectedSection == index
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .shadow(if (isSel) 4.dp else 0.dp, RoundedCornerShape(20.dp))
                        .background(if (isSel) Color.White else Color.Transparent, RoundedCornerShape(20.dp))
                        .clickable { selectedSection = index }
                        .padding(horizontal = 16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = label,
                        color = if (isSel) SassTextPrimary else SassTextSecondary,
                        fontWeight = if (isSel) FontWeight.Bold else FontWeight.Medium,
                        fontSize = 13.sp,
                        maxLines = 1
                    )
                }
            }
        }

        val filteredItems = remember(selectedSection, leaves, expenses, crmSheets, documents, applicants) {
            when (selectedSection) {
                0 -> leaves.filter { it.jsonObject["status"]?.jsonPrimitive?.contentOrNull == "Pending" }
                1 -> expenses.filter { it.jsonObject["status"]?.jsonPrimitive?.contentOrNull == "Pending" }
                2 -> crmSheets.filter { it.jsonObject["status"]?.jsonPrimitive?.contentOrNull == "Pending" }
                3 -> documents.filter {
                    val notes = it.jsonObject["notes"]?.jsonPrimitive?.contentOrNull ?: ""
                    notes.contains("Approval status: Pending") && !notes.contains("Approval status: Approved")
                }
                4 -> applicants.filter {
                    val stage = it.jsonObject["stage"]?.jsonPrimitive?.contentOrNull ?: "Applied"
                    !listOf("Offer", "Appointed", "Rejected").contains(stage)
                }
                else -> emptyList()
            }
        }

        if (filteredItems.isEmpty()) {
            Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text(text = "No pending approvals.", color = SassTextSecondary, fontSize = 14.sp)
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.weight(1f).fillMaxWidth()
            ) {
                items(filteredItems) { item ->
                    val obj = item.jsonObject
                    val id = obj["id"]?.jsonPrimitive?.contentOrNull ?: ""
                    
                    when (selectedSection) {
                        0 -> {
                            val empName = obj["employeeName"]?.jsonPrimitive?.contentOrNull ?: "Employee"
                            val type = obj["leaveType"]?.jsonPrimitive?.contentOrNull ?: "Leave"
                            val start = obj["startsAt"]?.jsonPrimitive?.contentOrNull ?: ""
                            val end = obj["endsAt"]?.jsonPrimitive?.contentOrNull ?: ""
                            val reason = obj["reason"]?.jsonPrimitive?.contentOrNull ?: ""

                            ApprovalsActionCard(
                                title = empName,
                                desc = "$type: ${start.take(10)} to ${end.take(10)}\nReason: $reason",
                                onApprove = { onAction("leave", id, "Approved") },
                                onReject = { onAction("leave", id, "Rejected") }
                            )
                        }
                        1 -> {
                            val empName = obj["employeeName"]?.jsonPrimitive?.contentOrNull ?: "Employee"
                            val category = obj["category"]?.jsonPrimitive?.contentOrNull ?: "Expense"
                            val amount = obj["amount"]?.jsonPrimitive?.contentOrNull ?: "0"
                            val notes = obj["notes"]?.jsonPrimitive?.contentOrNull ?: ""

                            ApprovalsActionCard(
                                title = empName,
                                desc = "$category claim of ₹$amount\nNotes: $notes",
                                onApprove = { onAction("expense", id, "Approved") },
                                onReject = { onAction("expense", id, "Rejected") }
                            )
                        }
                        2 -> {
                            val reqName = obj["requestedByName"]?.jsonPrimitive?.contentOrNull ?: "Employee"
                            val title = obj["title"]?.jsonPrimitive?.contentOrNull ?: "CRM Sheet"
                            val sourceName = obj["sourceName"]?.jsonPrimitive?.contentOrNull ?: "Pasted data"

                            ApprovalsActionCard(
                                title = title,
                                desc = "Requested by: $reqName\nSource: $sourceName",
                                onApprove = { onAction("crmSheet", id, "Approved") },
                                onReject = { onAction("crmSheet", id, "Rejected") }
                            )
                        }
                        3 -> {
                            val empName = obj["employeeName"]?.jsonPrimitive?.contentOrNull ?: "General Document"
                            val title = obj["title"]?.jsonPrimitive?.contentOrNull ?: "Document"
                            val docType = obj["documentType"]?.jsonPrimitive?.contentOrNull ?: "PDF"
                            val notes = obj["notes"]?.jsonPrimitive?.contentOrNull ?: ""

                            ApprovalsActionCard(
                                title = title,
                                desc = "Employee: $empName\nType: $docType\nStatus: $notes",
                                onApprove = { onAction("document", id, "Approved") },
                                onReject = null,
                                approveText = "Approve & Sign"
                            )
                        }
                        4 -> {
                            val name = obj["name"]?.jsonPrimitive?.contentOrNull ?: "Applicant"
                            val email = obj["email"]?.jsonPrimitive?.contentOrNull ?: ""
                            val role = obj["roleApplied"]?.jsonPrimitive?.contentOrNull ?: ""
                            val stage = obj["stage"]?.jsonPrimitive?.contentOrNull ?: "Applied"

                            ApprovalsActionCard(
                                title = name,
                                desc = "Applying for: $role\nEmail: $email\nCurrent Stage: $stage",
                                onApprove = { onAction("applicant", id, "Interviewing") },
                                onReject = { onAction("applicant", id, "Rejected") },
                                approveText = "Interview"
                            )
                        }
                    }
                }
            }
        }
    }
}

@Suppress("DEPRECATION")
@Composable
fun ApprovalsActionCard(
    title: String,
    desc: String,
    onApprove: () -> Unit,
    onReject: (() -> Unit)? = null,
    approveText: String = "Approve"
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(8.dp, RoundedCornerShape(28.dp))
            .background(SassCard, RoundedCornerShape(28.dp))
            .padding(20.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(text = title, color = SassTextPrimary, style = SassCardTitle)
            Text(text = desc, color = SassTextSecondary, fontSize = 14.sp)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (onReject != null) {
                    Button(
                        onClick = onReject,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFEF2F2)),
                        modifier = Modifier.weight(1f).height(44.dp),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Text("Reject", color = SassDanger, fontWeight = FontWeight.Bold)
                    }
                }
                Button(
                    onClick = onApprove,
                    colors = ButtonDefaults.buttonColors(containerColor = SassPrimary),
                    modifier = Modifier.weight(1.2f).height(44.dp),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text(approveText, color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

// ---------------- LEAVES OVERLAY SCREEN (REGULAR WORKERS) ----------------
@Composable
fun LeavesOverlayScreen(
    data: JsonObject?,
    openLeaveFAB: Boolean,
    openExpenseFAB: Boolean,
    onClose: () -> Unit,
    onClearFABStates: () -> Unit,
    onSubmitLeave: (type: String, start: String, end: String, reason: String) -> Unit,
    onSubmitExpense: (category: String, amount: String, date: String, notes: String) -> Unit
) {
    val leaves = remember(data) { data?.get("leaveRequests")?.jsonArray ?: JsonArray(emptyList()) }
    val expenses = remember(data) { data?.get("expenses")?.jsonArray ?: JsonArray(emptyList()) }

    var showLeaveForm by remember { mutableStateOf(false) }
    var showExpenseForm by remember { mutableStateOf(false) }

    LaunchedEffect(openLeaveFAB, openExpenseFAB) {
        if (openLeaveFAB) {
            showLeaveForm = true
            onClearFABStates()
        }
        if (openExpenseFAB) {
            showExpenseForm = true
            onClearFABStates()
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().background(SassBackground)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().background(SassCard).padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onClose) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = SassTextPrimary)
            }
            Text(text = "My Leaves & Claims", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }

        LazyColumn(
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
            modifier = Modifier.weight(1f).fillMaxWidth()
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Button(
                        onClick = { showLeaveForm = true },
                        colors = ButtonDefaults.buttonColors(containerColor = SassPrimary),
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier.weight(1f).height(52.dp)
                    ) {
                        Text("Apply Leave", fontWeight = FontWeight.Bold, color = Color.White)
                    }
                    Button(
                        onClick = { showExpenseForm = true },
                        colors = ButtonDefaults.buttonColors(containerColor = SassSecondary),
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier.weight(1f).height(52.dp)
                    ) {
                        Text("Claim Expense", fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }

            item {
                Text(text = "Leave Log Requests", style = SassSectionTitle, color = SassTextPrimary)
            }

            if (leaves.isEmpty()) {
                item {
                    Text(text = "No leave requests found.", color = SassTextSecondary, fontSize = 14.sp)
                }
            } else {
                items(leaves) { leaveItem ->
                    val obj = leaveItem.jsonObject
                    val type = obj["leaveType"]?.jsonPrimitive?.contentOrNull ?: "Leave"
                    val start = obj["startsAt"]?.jsonPrimitive?.contentOrNull ?: ""
                    val end = obj["endsAt"]?.jsonPrimitive?.contentOrNull ?: ""
                    val status = obj["status"]?.jsonPrimitive?.contentOrNull ?: "Pending"
                    
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(8.dp, RoundedCornerShape(24.dp))
                            .background(SassCard, RoundedCornerShape(24.dp))
                            .padding(20.dp)
                    ) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column {
                                Text(text = "$type Request", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                Text(text = "From: ${start.take(10)} to ${end.take(10)}", color = SassTextSecondary, fontSize = 13.sp)
                            }
                            Text(
                                text = status,
                                color = if (status == "Approved") SassSuccess else SassWarning,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                    }
                }
            }

            item {
                Text(text = "Expense Reimbursement Claims", style = SassSectionTitle, color = SassTextPrimary)
            }

            if (expenses.isEmpty()) {
                item {
                    Text(text = "No expense claims found.", color = SassTextSecondary, fontSize = 14.sp)
                }
            } else {
                items(expenses) { expItem ->
                    val obj = expItem.jsonObject
                    val category = obj["category"]?.jsonPrimitive?.contentOrNull ?: "Expense"
                    val amount = obj["amount"]?.jsonPrimitive?.contentOrNull ?: "0"
                    val status = obj["status"]?.jsonPrimitive?.contentOrNull ?: "Pending"
                    
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(8.dp, RoundedCornerShape(24.dp))
                            .background(SassCard, RoundedCornerShape(24.dp))
                            .padding(20.dp)
                    ) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column {
                                Text(text = category, color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                Text(text = "Amount Claimed: ₹$amount", color = SassTextSecondary, fontSize = 13.sp)
                            }
                            Text(
                                text = status,
                                color = if (status == "Approved") SassSuccess else SassWarning,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                    }
                }
            }
        }
    }

    if (showLeaveForm) {
        var leaveType by remember { mutableStateOf("Casual") }
        var startsAt by remember { mutableStateOf("2026-06-15") }
        var endsAt by remember { mutableStateOf("2026-06-16") }
        var reason by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { showLeaveForm = false },
            confirmButton = {
                Button(
                    onClick = {
                        onSubmitLeave(leaveType, startsAt, endsAt, reason)
                        showLeaveForm = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SassPrimary),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Submit Leave Request", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLeaveForm = false }) {
                    Text("Cancel", color = SassTextSecondary)
                }
            },
            title = { Text("Request Leave Session", style = SassCardTitle) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    PremiumTextField(value = leaveType, onValueChange = { leaveType = it }, label = "Leave Type", placeholder = "Casual / Sick")
                    PremiumTextField(value = startsAt, onValueChange = { startsAt = it }, label = "Starts Date", placeholder = "YYYY-MM-DD")
                    PremiumTextField(value = endsAt, onValueChange = { endsAt = it }, label = "Ends Date", placeholder = "YYYY-MM-DD")
                    PremiumTextField(value = reason, onValueChange = { reason = it }, label = "Reason for leave", placeholder = "Out of town")
                }
            },
            containerColor = SassCard,
            shape = RoundedCornerShape(28.dp)
        )
    }

    if (showExpenseForm) {
        var category by remember { mutableStateOf("Travel") }
        var amount by remember { mutableStateOf("") }
        var date by remember { mutableStateOf("2026-06-12") }
        var notes by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { showExpenseForm = false },
            confirmButton = {
                Button(
                    onClick = {
                        onSubmitExpense(category, amount, date, notes)
                        showExpenseForm = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SassSecondary),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Submit Reimbursement", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showExpenseForm = false }) {
                    Text("Cancel", color = SassTextSecondary)
                }
            },
            title = { Text("Submit Expense Receipt Claim", style = SassCardTitle) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    PremiumTextField(value = category, onValueChange = { category = it }, label = "Category", placeholder = "Travel / Office / Food")
                    PremiumTextField(value = amount, onValueChange = { amount = it }, label = "Amount (INR)", placeholder = "₹500", keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                    PremiumTextField(value = date, onValueChange = { date = it }, label = "Claim Date", placeholder = "YYYY-MM-DD")
                    PremiumTextField(value = notes, onValueChange = { notes = it }, label = "Expense notes", placeholder = "Client lunch meeting")
                }
            },
            containerColor = SassCard,
            shape = RoundedCornerShape(28.dp)
        )
    }
}

// ---------------- DOCUMENTS OVERLAY SCREEN ----------------
@Composable
fun DocsOverlayScreen(
    data: JsonObject?,
    canSignDocuments: Boolean,
    onClose: () -> Unit,
    onViewDocument: (title: String, url: String) -> Unit,
    onSignDocument: (id: String) -> Unit
) {
    val documents = remember(data) { data?.get("documents")?.jsonArray ?: JsonArray(emptyList()) }
    val resources = remember(data) { data?.get("resources")?.jsonArray ?: JsonArray(emptyList()) }

    var selectedTab by remember { mutableStateOf(0) }

    Column(
        modifier = Modifier.fillMaxSize().background(SassBackground)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().background(SassCard).padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onClose) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = SassTextPrimary)
            }
            Text(text = "Corporate Archive", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 12.dp)
                .height(48.dp)
                .background(Color(0xFFF1F5F9), RoundedCornerShape(24.dp))
                .padding(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val tabs = listOf("Internal Documents", "Knowledge Hub")
            tabs.forEachIndexed { index, label ->
                val isSel = selectedTab == index
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .shadow(if (isSel) 4.dp else 0.dp, RoundedCornerShape(20.dp))
                        .background(if (isSel) Color.White else Color.Transparent, RoundedCornerShape(20.dp))
                        .clickable { selectedTab = index },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = label,
                        color = if (isSel) SassTextPrimary else SassTextSecondary,
                        fontWeight = if (isSel) FontWeight.Bold else FontWeight.Medium,
                        fontSize = 14.sp
                    )
                }
            }
        }

        val activeList = remember(selectedTab, documents, resources) {
            if (selectedTab == 0) documents else resources
        }

        if (activeList.isEmpty()) {
            Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text(text = "No archive items available.", color = SassTextSecondary, fontSize = 14.sp)
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.weight(1f).fillMaxWidth()
            ) {
                items(activeList) { item ->
                    val obj = item.jsonObject
                    val docId = obj["id"]?.jsonPrimitive?.contentOrNull ?: ""
                    val title = obj["title"]?.jsonPrimitive?.contentOrNull ?: "Archive document"
                    val desc = obj["notes"]?.jsonPrimitive?.contentOrNull ?: obj["description"]?.jsonPrimitive?.contentOrNull ?: ""
                    val url = obj["url"]?.jsonPrimitive?.contentOrNull ?: ""

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(8.dp, RoundedCornerShape(24.dp))
                            .background(SassCard, RoundedCornerShape(24.dp))
                            .padding(20.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(text = title, color = SassTextPrimary, style = SassCardTitle)
                            if (desc.isNotEmpty()) {
                                Text(text = desc, color = SassTextSecondary, fontSize = 13.sp)
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.End,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Approve / Sign Document action restricted to authorized superiors
                                if (selectedTab == 0 && canSignDocuments) {
                                    Button(
                                        onClick = { onSignDocument(docId) },
                                        colors = ButtonDefaults.buttonColors(containerColor = SassSuccess),
                                        shape = RoundedCornerShape(12.dp),
                                        modifier = Modifier.padding(end = 8.dp)
                                    ) {
                                        Text("Approve & Sign", color = Color.White, fontSize = 12.sp)
                                    }
                                }
                                if (url.isNotEmpty()) {
                                    Button(
                                        onClick = { onViewDocument(title, url) },
                                        colors = ButtonDefaults.buttonColors(containerColor = SassPrimary),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Text("Open", color = Color.White, fontSize = 12.sp)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ---------------- LIVE GROUP CHAT OVERLAY SCREEN ----------------
@Composable
fun SupportOverlayScreen(
    messages: List<JsonObject>,
    onClose: () -> Unit,
    onSendMessage: (body: String) -> Unit
) {
    val inputMsg = remember { mutableStateOf("") }
    val lazyListState = rememberLazyListState()

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            lazyListState.animateScrollToItem(messages.size - 1)
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().background(SassBackground)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().background(SassCard).padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onClose) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = SassTextPrimary)
            }
            Text(text = "Support & Team Room", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }

        LazyColumn(
            state = lazyListState,
            modifier = Modifier.weight(1f).fillMaxWidth(),
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(messages) { msgObj ->
                val name = msgObj["employeeName"]?.jsonPrimitive?.contentOrNull ?: "Team member"
                val body = msgObj["body"]?.jsonPrimitive?.contentOrNull ?: ""
                val role = msgObj["employeeRole"]?.jsonPrimitive?.contentOrNull ?: ""

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(4.dp, RoundedCornerShape(24.dp))
                        .background(SassCard, RoundedCornerShape(24.dp))
                        .padding(16.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(text = name, color = SassPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(text = role.replace("_", " ").uppercase(), color = SassTextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                        Text(text = body, color = SassTextPrimary, fontSize = 14.sp)
                    }
                }
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth().background(SassCard).padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            BasicTextField(
                value = inputMsg.value,
                onValueChange = { inputMsg.value = it },
                textStyle = TextStyle(color = SassTextPrimary, fontSize = 15.sp),
                singleLine = true,
                modifier = Modifier.weight(1f),
                decorationBox = { innerTextField ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .background(Color(0xFFF1F5F9), RoundedCornerShape(20.dp))
                            .padding(horizontal = 20.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(modifier = Modifier.weight(1f)) {
                            if (inputMsg.value.isEmpty()) {
                                Text(
                                    text = "Send message to team...",
                                    color = SassTextSecondary.copy(alpha = 0.6f),
                                    fontSize = 15.sp
                                )
                            }
                            innerTextField()
                        }
                    }
                }
            )
            Box(
                modifier = Modifier
                    .size(52.dp)
                    .background(
                        brush = Brush.linearGradient(colors = listOf(SassPrimary, SassSecondary)),
                        shape = CircleShape
                    )
                    .clickable {
                        if (inputMsg.value.isNotBlank()) {
                            onSendMessage(inputMsg.value)
                            inputMsg.value = ""
                        }
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Send, contentDescription = "Send", tint = Color.White, modifier = Modifier.size(20.dp))
            }
        }
    }
}

// ---------------- STAFF OVERLAY SCREEN ----------------
@Composable
fun StaffOverlayScreen(
    data: JsonObject?,
    canManage: Boolean,
    onClose: () -> Unit,
    onSaveEmployee: (
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
    ) -> Unit,
    onDeleteEmployee: (id: String) -> Unit,
    onSaveDepartment: (id: String?, name: String, description: String?, managerId: String?, active: String) -> Unit,
    onDeleteDepartment: (id: String) -> Unit
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    
    val usersList = remember(data) { data?.get("users")?.jsonArray ?: JsonArray(emptyList()) }
    val departments = remember(data) { data?.get("departments")?.jsonArray ?: JsonArray(emptyList()) }
    val currentUserId = remember(data) { data?.get("session")?.jsonObject?.get("id")?.jsonPrimitive?.contentOrNull ?: "" }

    var editingUser by remember { mutableStateOf<JsonObject?>(null) }
    var showAddDialog by remember { mutableStateOf(false) }

    var showAddDeptDialog by remember { mutableStateOf(false) }
    var editingDeptId by remember { mutableStateOf<String?>(null) }
    var deptNameInput by remember { mutableStateOf("") }
    var deptDescInput by remember { mutableStateOf("") }
    var deptActiveInput by remember { mutableStateOf("Active") }
    var deptManagerIdInput by remember { mutableStateOf("") }

    // Form states
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("employee") }
    var departmentId by remember { mutableStateOf("") }
    var managerId by remember { mutableStateOf("") }
    var title by remember { mutableStateOf("Team Member") }
    var employeeType by remember { mutableStateOf("Full-time") }
    var compensationStatus by remember { mutableStateOf("Paid") }
    var workStartTime by remember { mutableStateOf("09:00") }
    var workEndTime by remember { mutableStateOf("18:00") }
    var status by remember { mutableStateOf("Active") }

    Column(modifier = Modifier.fillMaxSize().background(SassBackground)) {
        Row(
            modifier = Modifier.fillMaxWidth().background(SassCard).padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onClose) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = SassTextPrimary)
            }
            Text(text = "Staff Directory", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.weight(1f))
            
            if (canManage) {
                IconButton(onClick = {
                    val message = "BLUEVOLT hiring form link:\nhttps://bluevolt.group/employee/apply\n\nPlease fill this form if you are applying for an employee or internship role."
                    clipboardManager.setText(AnnotatedString(message))
                    Toast.makeText(context, "Hiring link copied to clipboard!", Toast.LENGTH_SHORT).show()
                }) {
                    Icon(Icons.Default.Share, contentDescription = "Copy Hiring Link", tint = SassPrimary)
                }
                IconButton(onClick = {
                    name = ""
                    email = ""
                    password = ""
                    role = "employee"
                    departmentId = ""
                    managerId = ""
                    title = "Team Member"
                    employeeType = "Full-time"
                    compensationStatus = "Paid"
                    workStartTime = "09:00"
                    workEndTime = "18:00"
                    status = "Active"
                    showAddDialog = true
                }) {
                    Icon(Icons.Default.AddCircle, contentDescription = "Add Staff", tint = SassPrimary)
                }
            }
        }

        LazyColumn(
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.weight(1f).fillMaxWidth()
        ) {
            item {
                Text(text = "Employees", style = SassSectionTitle, color = SassTextPrimary)
            }

            if (usersList.isEmpty()) {
                item {
                    Text(text = "No staff members listed.", color = SassTextSecondary, fontSize = 14.sp)
                }
            } else {
                items(usersList) { userItem ->
                    val user = userItem.jsonObject
                    val userId = user["id"]?.jsonPrimitive?.contentOrNull ?: ""
                    val uName = user["name"]?.jsonPrimitive?.contentOrNull ?: "Employee"
                    val uEmail = user["email"]?.jsonPrimitive?.contentOrNull ?: ""
                    val uRole = user["role"]?.jsonPrimitive?.contentOrNull ?: "employee"
                    val uDept = user["department"]?.jsonPrimitive?.contentOrNull ?: "General"
                    val uDeptId = user["departmentId"]?.jsonPrimitive?.contentOrNull ?: ""
                    val uMgrId = user["managerId"]?.jsonPrimitive?.contentOrNull ?: ""
                    val uTitle = user["title"]?.jsonPrimitive?.contentOrNull ?: "Team Member"
                    val uEmpType = user["employeeType"]?.jsonPrimitive?.contentOrNull ?: "Full-time"
                    val uComp = user["compensationStatus"]?.jsonPrimitive?.contentOrNull ?: "Paid"
                    val uStart = user["workStartTime"]?.jsonPrimitive?.contentOrNull ?: "09:00"
                    val uEnd = user["workEndTime"]?.jsonPrimitive?.contentOrNull ?: "18:00"
                    val uStatus = user["status"]?.jsonPrimitive?.contentOrNull ?: "Active"
                    val isOnline = user["isOnline"]?.jsonPrimitive?.booleanOrNull ?: false
                    
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(8.dp, RoundedCornerShape(28.dp))
                            .background(SassCard, RoundedCornerShape(28.dp))
                            .clickable(enabled = canManage) {
                                name = uName
                                email = uEmail
                                password = ""
                                role = uRole
                                departmentId = uDeptId
                                managerId = uMgrId
                                title = uTitle
                                employeeType = uEmpType
                                compensationStatus = uComp
                                workStartTime = uStart
                                workEndTime = uEnd
                                status = uStatus
                                editingUser = user
                            }
                            .padding(20.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(text = uName, color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                Text(text = uEmail, color = SassTextSecondary, fontSize = 13.sp)
                                Text(text = "Title: $uTitle • Dept: $uDept", color = SassTextSecondary, fontSize = 12.sp)
                                Text(text = "Role: ${uRole.replace("_", " ").uppercase()} • Hours: $uStart - $uEnd", color = SassTextSecondary, fontSize = 12.sp)
                                if (canManage) {
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(text = "Tap to edit employee profile", color = SassPrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                            
                            Column(
                                horizontalAlignment = Alignment.End,
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .background(if (isOnline) SassSuccess else SassTextSecondary, CircleShape)
                                    )
                                    Text(
                                        text = if (isOnline) "Active" else "Offline",
                                        color = if (isOnline) SassSuccess else SassTextSecondary,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                
                                if (canManage && userId != currentUserId) {
                                    IconButton(
                                        onClick = {
                                            android.app.AlertDialog.Builder(context)
                                                .setTitle("Delete Staff Member")
                                                .setMessage("Are you sure you want to delete $uName? This action cannot be undone.")
                                                .setPositiveButton("Delete") { _, _ -> onDeleteEmployee(userId) }
                                                .setNegativeButton("Cancel", null)
                                                .show()
                                        },
                                        modifier = Modifier.size(32.dp)
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = "Delete Staff", tint = SassDanger, modifier = Modifier.size(18.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(24.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "Departments", style = SassSectionTitle, color = SassTextPrimary)
                    if (canManage) {
                        TextButton(onClick = {
                            editingDeptId = null
                            deptNameInput = ""
                            deptDescInput = ""
                            deptActiveInput = "Active"
                            deptManagerIdInput = ""
                            showAddDeptDialog = true
                        }) {
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Add, contentDescription = "Add Dept", modifier = Modifier.size(16.dp))
                                Text("New Dept", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            if (departments.isEmpty()) {
                item {
                    Text(text = "No departments found.", color = SassTextSecondary, fontSize = 14.sp)
                }
            } else {
                items(departments) { deptItem ->
                    val dept = deptItem.jsonObject
                    val deptId = dept["id"]?.jsonPrimitive?.contentOrNull ?: ""
                    val deptName = dept["name"]?.jsonPrimitive?.contentOrNull ?: "Department"
                    val deptDesc = dept["description"]?.jsonPrimitive?.contentOrNull ?: ""
                    val isActive = dept["active"]?.jsonPrimitive?.booleanOrNull ?: true
                    val mgrId = dept["managerId"]?.jsonPrimitive?.contentOrNull ?: ""

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(8.dp, RoundedCornerShape(28.dp))
                            .background(SassCard, RoundedCornerShape(28.dp))
                            .clickable(enabled = canManage) {
                                editingDeptId = deptId
                                deptNameInput = deptName
                                deptDescInput = deptDesc
                                deptActiveInput = if (isActive) "Active" else "Inactive"
                                deptManagerIdInput = mgrId
                                showAddDeptDialog = true
                            }
                            .padding(20.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(text = deptName, color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                Box(
                                    modifier = Modifier
                                        .background(
                                            color = if (isActive) Color(0xFFECFDF5) else Color(0xFFFFF7ED),
                                            shape = RoundedCornerShape(12.dp)
                                        )
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = if (isActive) "Active" else "Inactive",
                                        color = if (isActive) SassSuccess else SassWarning,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                            if (deptDesc.isNotEmpty()) {
                                Text(text = deptDesc, color = SassTextSecondary, fontSize = 13.sp)
                            }
                            if (canManage) {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(text = "Tap to edit department", color = SassPrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }

    if ((editingUser != null || showAddDialog) && canManage) {
        val isEdit = editingUser != null
        val empId = editingUser?.get("id")?.jsonPrimitive?.contentOrNull
        
        AlertDialog(
            onDismissRequest = {
                editingUser = null
                showAddDialog = false
            },
            title = { Text(text = if (isEdit) "Edit Profile: $name" else "Appoint New Employee", style = SassCardTitle) },
            text = {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth().heightIn(max = 400.dp)
                ) {
                    item {
                        PremiumTextField(value = name, onValueChange = { name = it }, label = "Full Name", placeholder = "John Doe")
                    }
                    item {
                        PremiumTextField(value = email, onValueChange = { email = it }, label = "Email Address", placeholder = "john@bluevolt.group")
                    }
                    item {
                        PremiumTextField(
                            value = password,
                            onValueChange = { password = it },
                            label = if (isEdit) "New Password (Optional)" else "Portal Password (Defaults: abc123)",
                            placeholder = if (isEdit) "Leave empty to keep current" else "abc123",
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
                        )
                    }
                    item {
                        PremiumTextField(value = role, onValueChange = { role = it }, label = "System Role Title", placeholder = "employee / admin / super_admin")
                    }
                    item {
                        PremiumTextField(value = title, onValueChange = { title = it }, label = "Job Title", placeholder = "Software Engineer")
                    }
                    item {
                        PremiumTextField(value = employeeType, onValueChange = { employeeType = it }, label = "Employment Type", placeholder = "Full-time / Intern / Contractor")
                    }
                    item {
                        PremiumTextField(value = compensationStatus, onValueChange = { compensationStatus = it }, label = "Compensation Status", placeholder = "Paid / Unpaid")
                    }
                    item {
                        PremiumTextField(value = workStartTime, onValueChange = { workStartTime = it }, label = "Shift Starts (HH:MM)", placeholder = "09:00")
                    }
                    item {
                        PremiumTextField(value = workEndTime, onValueChange = { workEndTime = it }, label = "Shift Ends (HH:MM)", placeholder = "18:00")
                    }
                    item {
                        PremiumTextField(value = status, onValueChange = { status = it }, label = "Account Status", placeholder = "Active / Inactive")
                    }
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("Reporting Department ID:", color = SassTextSecondary, fontSize = 12.sp)
                            PremiumTextField(value = departmentId, onValueChange = { departmentId = it }, label = "", placeholder = "e.g. 1")
                            Text("Available Departments in database:", color = SassTextSecondary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                            departments.forEach { dept ->
                                val deptObj = dept.jsonObject
                                Text("• ID ${deptObj["id"]?.jsonPrimitive?.contentOrNull}: ${deptObj["name"]?.jsonPrimitive?.contentOrNull}", color = SassTextSecondary, fontSize = 11.sp)
                            }
                        }
                    }
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("Reporting Manager ID:", color = SassTextSecondary, fontSize = 12.sp)
                            PremiumTextField(value = managerId, onValueChange = { managerId = it }, label = "", placeholder = "e.g. 2")
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (name.isNotEmpty() && email.isNotEmpty() && role.isNotEmpty()) {
                            onSaveEmployee(
                                empId, name, email, password.takeIf { it.isNotEmpty() }, role,
                                departmentId.takeIf { it.isNotEmpty() }, managerId.takeIf { it.isNotEmpty() },
                                title, employeeType, compensationStatus, workStartTime, workEndTime, status
                            )
                            editingUser = null
                            showAddDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SassPrimary),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text(if (isEdit) "Save Profile" else "Create Account", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    editingUser = null
                    showAddDialog = false
                }) {
                    Text("Cancel", color = SassTextSecondary)
                }
            },
            containerColor = SassCard,
            shape = RoundedCornerShape(28.dp)
        )
    }

    if (showAddDeptDialog && canManage) {
        val isEditDept = editingDeptId != null
        AlertDialog(
            onDismissRequest = {
                showAddDeptDialog = false
                editingDeptId = null
            },
            title = { Text(text = if (isEditDept) "Edit Department" else "Create Department", style = SassCardTitle) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    PremiumTextField(value = deptNameInput, onValueChange = { deptNameInput = it }, label = "Department Name", placeholder = "e.g. Sales Operations")
                    PremiumTextField(value = deptDescInput, onValueChange = { deptDescInput = it }, label = "Description", placeholder = "e.g. Handles enterprise accounts")
                    PremiumTextField(value = deptActiveInput, onValueChange = { deptActiveInput = it }, label = "Status (Active / Inactive)", placeholder = "Active")
                    
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Manager Employee ID (Optional):", color = SassTextSecondary, fontSize = 12.sp)
                        PremiumTextField(value = deptManagerIdInput, onValueChange = { deptManagerIdInput = it }, label = "", placeholder = "e.g. 2")
                    }
                }
            },
            confirmButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (isEditDept) {
                        Button(
                            onClick = {
                                android.app.AlertDialog.Builder(context)
                                    .setTitle("Delete Department")
                                    .setMessage("Are you sure you want to delete this department? This action cannot be undone.")
                                    .setPositiveButton("Delete") { _, _ ->
                                        onDeleteDepartment(editingDeptId!!)
                                        showAddDeptDialog = false
                                        editingDeptId = null
                                    }
                                    .setNegativeButton("Cancel", null)
                                    .show()
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFEF2F2)),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Text("Delete", color = SassDanger)
                        }
                    }
                    Button(
                        onClick = {
                            if (deptNameInput.isNotEmpty()) {
                                onSaveDepartment(
                                    editingDeptId,
                                    deptNameInput,
                                    deptDescInput.takeIf { it.isNotEmpty() },
                                    deptManagerIdInput.takeIf { it.isNotEmpty() },
                                    deptActiveInput
                                )
                                showAddDeptDialog = false
                                editingDeptId = null
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = SassPrimary),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Text("Save", color = Color.White)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    showAddDeptDialog = false
                    editingDeptId = null
                }) {
                    Text("Cancel", color = SassTextSecondary)
                }
            },
            containerColor = SassCard,
            shape = RoundedCornerShape(28.dp)
        )
    }
}

// ---------------- PAYROLL OVERLAY SCREEN ----------------
@Composable
fun PayrollOverlayScreen(
    data: JsonObject?,
    onClose: () -> Unit
) {
    val payroll = remember(data) {
        data?.get("payrollInputs")?.jsonArray ?: JsonArray(emptyList())
    }

    Column(
        modifier = Modifier.fillMaxSize().background(SassBackground)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().background(SassCard).padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onClose) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = SassTextPrimary)
            }
            Text(text = "Compensation & Payroll", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }

        if (payroll.isEmpty()) {
            Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text(text = "No payroll records found.", color = SassTextSecondary, fontSize = 14.sp)
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.weight(1f).fillMaxWidth()
            ) {
                items(payroll) { entry ->
                    val obj = entry.jsonObject
                    val employeeName = obj["employeeName"]?.jsonPrimitive?.contentOrNull ?: "Employee"
                    val month = obj["payMonth"]?.jsonPrimitive?.contentOrNull ?: "Month"
                    val amount = obj["baseSalary"]?.jsonPrimitive?.contentOrNull ?: "0"
                    val status = obj["status"]?.jsonPrimitive?.contentOrNull ?: "Pending"

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(8.dp, RoundedCornerShape(28.dp))
                            .background(SassCard, RoundedCornerShape(28.dp))
                            .padding(20.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(text = employeeName, color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                Text(text = "Pay Month: $month", color = SassTextSecondary, fontSize = 13.sp)
                                Text(text = "Salary Amount: ₹$amount", color = SassTextSecondary, fontSize = 13.sp)
                            }
                            Box(
                                modifier = Modifier
                                    .background(
                                        color = if (status == "Paid") Color(0xFFECFDF5) else Color(0xFFFFF7ED),
                                        shape = RoundedCornerShape(12.dp)
                                    )
                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = status,
                                    color = if (status == "Paid") SassSuccess else SassWarning,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}


// ---------------- AUDIT OVERLAY SCREEN ----------------
@Composable
fun AuditOverlayScreen(
    data: JsonObject?,
    onClose: () -> Unit
) {
    val auditEvents = remember(data) {
        data?.get("auditEvents")?.jsonArray ?: JsonArray(emptyList())
    }
    
    Column(
        modifier = Modifier.fillMaxSize().background(SassBackground)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().background(SassCard).padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onClose) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = SassTextPrimary)
            }
            Text(text = "Workspace Security Audit Log", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }

        if (auditEvents.isEmpty()) {
            Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text(text = "No audit events logged.", color = SassTextSecondary, fontSize = 14.sp)
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.weight(1f).fillMaxWidth()
            ) {
                items(auditEvents) { event ->
                    val obj = event.jsonObject
                    val actorName = obj["actorName"]?.jsonPrimitive?.contentOrNull ?: "System"
                    val action = obj["action"]?.jsonPrimitive?.contentOrNull ?: "Action"
                    val entityType = obj["entityType"]?.jsonPrimitive?.contentOrNull ?: ""
                    val createdAt = obj["createdAt"]?.jsonPrimitive?.contentOrNull ?: ""

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(8.dp, RoundedCornerShape(28.dp))
                            .background(SassCard, RoundedCornerShape(28.dp))
                            .padding(20.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(text = actorName, color = SassPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text(text = createdAt.take(10), color = SassTextSecondary, fontSize = 11.sp)
                            }
                            Text(text = "Performed: $action on $entityType", color = SassTextPrimary, fontSize = 14.sp)
                        }
                    }
                }
            }
        }
    }
}

// ---------------- APPLICANTS OVERLAY SCREEN ----------------
@Composable
fun ApplicantsOverlayScreen(
    data: JsonObject?,
    canManageApplicants: Boolean,
    onClose: () -> Unit,
    onAction: (id: String, stage: String) -> Unit
) {
    val applicants = remember(data) { data?.get("applicants")?.jsonArray ?: JsonArray(emptyList()) }

    Column(modifier = Modifier.fillMaxSize().background(SassBackground)) {
        Row(
            modifier = Modifier.fillMaxWidth().background(SassCard).padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onClose) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = SassTextPrimary)
            }
            Text(text = "Job Applicants Pipeline", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }

        LazyColumn(
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.weight(1f).fillMaxWidth()
        ) {
            if (applicants.isEmpty()) {
                item {
                    Text("No applicants in pipeline.", color = SassTextSecondary, fontSize = 14.sp)
                }
            } else {
                items(applicants) { item ->
                    val obj = item.jsonObject
                    val id = obj["id"]?.jsonPrimitive?.contentOrNull ?: ""
                    val name = obj["name"]?.jsonPrimitive?.contentOrNull ?: "Applicant"
                    val email = obj["email"]?.jsonPrimitive?.contentOrNull ?: ""
                    val role = obj["role"]?.jsonPrimitive?.contentOrNull ?: ""
                    val stage = obj["stage"]?.jsonPrimitive?.contentOrNull ?: "Applied"

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(8.dp, RoundedCornerShape(28.dp))
                            .background(SassCard, RoundedCornerShape(28.dp))
                            .padding(20.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Column {
                                    Text(text = name, color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    Text(text = email, color = SassTextSecondary, fontSize = 13.sp)
                                }
                                Text(text = stage, color = SassPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                            Text(text = "Applying for role: $role", color = SassTextSecondary, fontSize = 13.sp)
                            
                            if (canManageApplicants) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Button(
                                        onClick = { onAction(id, "Interviewing") },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEFF6FF)),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("Interview", color = SassPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                    Button(
                                        onClick = { onAction(id, "Offered") },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFECFDF5)),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("Offer", color = SassSuccess, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                    Button(
                                        onClick = { onAction(id, "Rejected") },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFEF2F2)),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("Reject", color = SassDanger, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ---------------- WORK OPS OVERLAY SCREEN ----------------
@Composable
fun WorkOpsOverlayScreen(
    data: JsonObject?,
    onClose: () -> Unit
) {
    val comments = remember(data) { data?.get("comments")?.jsonArray ?: JsonArray(emptyList()) }
    val attendance = remember(data) { data?.get("attendance")?.jsonArray ?: JsonArray(emptyList()) }

    Column(modifier = Modifier.fillMaxSize().background(SassBackground)) {
        Row(
            modifier = Modifier.fillMaxWidth().background(SassCard).padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onClose) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = SassTextPrimary)
            }
            Text(text = "Work Operations Center", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }

        LazyColumn(
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
            modifier = Modifier.weight(1f).fillMaxWidth()
        ) {
            item {
                Text("Ops Team Updates Feed", style = SassSectionTitle, color = SassTextPrimary)
            }

            if (comments.isEmpty()) {
                item {
                    Text("No ops comments yet.", color = SassTextSecondary, fontSize = 14.sp)
                }
            } else {
                items(comments) { commentItem ->
                    val obj = commentItem.jsonObject
                    val author = obj["authorName"]?.jsonPrimitive?.contentOrNull ?: "Employee"
                    val body = obj["body"]?.jsonPrimitive?.contentOrNull ?: ""
                    val time = obj["createdAt"]?.jsonPrimitive?.contentOrNull ?: ""

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(4.dp, RoundedCornerShape(20.dp))
                            .background(SassCard, RoundedCornerShape(20.dp))
                            .padding(16.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(text = author, color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text(text = time.take(10), color = SassTextSecondary, fontSize = 11.sp)
                            }
                            Text(text = body, color = SassTextSecondary, fontSize = 13.sp)
                        }
                    }
                }
            }

            item {
                Text("Recent Activity logs", style = SassSectionTitle, color = SassTextPrimary)
            }

            if (attendance.isEmpty()) {
                item {
                    Text("No activity logged today.", color = SassTextSecondary, fontSize = 14.sp)
                }
            } else {
                items(attendance.take(5)) { logItem ->
                    val obj = logItem.jsonObject
                    val employeeName = obj["employeeName"]?.jsonPrimitive?.contentOrNull ?: "Staff"
                    val login = obj["loginAt"]?.jsonPrimitive?.contentOrNull ?: ""
                    val logout = obj["logoutAt"]?.jsonPrimitive?.contentOrNull
                    val date = obj["workDate"]?.jsonPrimitive?.contentOrNull ?: ""

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(4.dp, RoundedCornerShape(20.dp))
                            .background(SassCard, RoundedCornerShape(20.dp))
                            .padding(16.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(text = employeeName, color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(
                                text = if (logout != null) {
                                    "Logged In: ${login.take(16).replace("T", " ")} | Logged Out: ${logout.take(16).replace("T", " ")}"
                                } else {
                                    "Status: WORKING since ${login.take(16).replace("T", " ")}"
                                },
                                color = SassTextSecondary,
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

// ---------------- EXPENSES OVERLAY SCREEN ----------------
@Composable
fun ExpensesOverlayScreen(
    data: JsonObject?,
    canManageExpenses: Boolean,
    onClose: () -> Unit,
    onAction: (id: String, status: String) -> Unit,
    onSubmitExpense: (category: String, amount: String, date: String, notes: String) -> Unit
) {
    val expenses = remember(data) { data?.get("expenses")?.jsonArray ?: JsonArray(emptyList()) }
    var showAddExpenseDialog by remember { mutableStateOf(false) }

    var category by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxSize().background(SassBackground)) {
        Row(
            modifier = Modifier.fillMaxWidth().background(SassCard).padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onClose) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = SassTextPrimary)
            }
            Text(text = "Expense Reimbursement", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.weight(1f))
            
            if (!canManageExpenses) {
                IconButton(onClick = { showAddExpenseDialog = true }) {
                    Icon(Icons.Default.AddCircle, contentDescription = "New Claim", tint = SassPrimary)
                }
            }
        }

        LazyColumn(
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.weight(1f).fillMaxWidth()
        ) {
            if (expenses.isEmpty()) {
                item {
                    Text("No expense claims logged.", color = SassTextSecondary, fontSize = 14.sp)
                }
            } else {
                items(expenses) { expItem ->
                    val obj = expItem.jsonObject
                    val id = obj["id"]?.jsonPrimitive?.contentOrNull ?: ""
                    val cat = obj["category"]?.jsonPrimitive?.contentOrNull ?: "Expense"
                    val amt = obj["amount"]?.jsonPrimitive?.contentOrNull ?: "0"
                    val date = obj["claimDate"]?.jsonPrimitive?.contentOrNull ?: ""
                    val note = obj["notes"]?.jsonPrimitive?.contentOrNull ?: ""
                    val status = obj["status"]?.jsonPrimitive?.contentOrNull ?: "Pending"
                    val empName = obj["employeeName"]?.jsonPrimitive?.contentOrNull ?: ""

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(8.dp, RoundedCornerShape(24.dp))
                            .background(SassCard, RoundedCornerShape(24.dp))
                            .padding(20.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Column {
                                    Text(text = cat, color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    if (empName.isNotEmpty()) {
                                        Text(text = "Claim by: $empName", color = SassTextSecondary, fontSize = 12.sp)
                                    }
                                    Text(text = "Date: $date", color = SassTextSecondary, fontSize = 12.sp)
                                }
                                Text(text = "₹$amt", color = SassPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                            Text(text = note, color = SassTextSecondary, fontSize = 13.sp)
                            
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "Status: $status",
                                    color = if (status == "Approved" || status == "Paid") SassSuccess else SassWarning,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp
                                )

                                if (canManageExpenses && status == "Pending") {
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Button(
                                            onClick = { onAction(id, "Approved") },
                                            colors = ButtonDefaults.buttonColors(containerColor = SassSuccess),
                                            shape = RoundedCornerShape(10.dp)
                                        ) {
                                            Text("Approve", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        }
                                        Button(
                                            onClick = { onAction(id, "Rejected") },
                                            colors = ButtonDefaults.buttonColors(containerColor = SassDanger),
                                            shape = RoundedCornerShape(10.dp)
                                        ) {
                                            Text("Reject", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAddExpenseDialog) {
        AlertDialog(
            onDismissRequest = { showAddExpenseDialog = false },
            title = { Text("New Expense Claim", style = SassCardTitle, color = SassTextPrimary) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    PremiumTextField(
                        value = category,
                        onValueChange = { category = it },
                        label = "Category",
                        placeholder = "Travel, Meals, Hardware"
                    )
                    PremiumTextField(
                        value = amount,
                        onValueChange = { amount = it },
                        label = "Amount (₹)",
                        placeholder = "500",
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                    )
                    PremiumTextField(
                        value = notes,
                        onValueChange = { notes = it },
                        label = "Notes / Purpose",
                        placeholder = "Explain the expense reason"
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (category.isNotEmpty() && amount.isNotEmpty()) {
                            onSubmitExpense(category, amount, SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()), notes)
                            showAddExpenseDialog = false
                            category = ""
                            amount = ""
                            notes = ""
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SassPrimary),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Submit Claim", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddExpenseDialog = false }) {
                    Text("Cancel", color = SassTextSecondary)
                }
            },
            containerColor = SassCard,
            shape = RoundedCornerShape(28.dp)
        )
    }
}

// ---------------- REPORTS OVERLAY SCREEN ----------------
@Composable
fun ReportsOverlayScreen(
    data: JsonObject?,
    onClose: () -> Unit
) {
    val usersList = remember(data) { data?.get("users")?.jsonArray ?: JsonArray(emptyList()) }
    val attendanceList = remember(data) { data?.get("attendance")?.jsonArray ?: JsonArray(emptyList()) }
    val tasks = remember(data) { data?.get("tasks")?.jsonArray ?: JsonArray(emptyList()) }
    
    val totalHoursLogged = remember(attendanceList) {
        attendanceList.sumOf { it.jsonObject["totalHours"]?.jsonPrimitive?.doubleOrNull ?: 0.0 }
    }
    val openTasksCount = remember(tasks) {
        tasks.count { it.jsonObject["status"]?.jsonPrimitive?.contentOrNull != "Done" }
    }
    val completedTasksCount = remember(tasks) {
        tasks.count { it.jsonObject["status"]?.jsonPrimitive?.contentOrNull == "Done" }
    }

    Column(modifier = Modifier.fillMaxSize().background(SassBackground)) {
        Row(
            modifier = Modifier.fillMaxWidth().background(SassCard).padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onClose) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = SassTextPrimary)
            }
            Text(text = "Superior Analytics & Reports", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }

        LazyColumn(
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
            modifier = Modifier.weight(1f).fillMaxWidth()
        ) {
            item {
                Text("Team Performance Index", style = SassSectionTitle, color = SassTextPrimary)
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    ProfileMetricItem(
                        label = "Total Employees",
                        value = "${usersList.size}",
                        modifier = Modifier.weight(1f)
                    )
                    ProfileMetricItem(
                        label = "Hours Logged",
                        value = "${totalHoursLogged.format(1)} hrs",
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(16.dp, RoundedCornerShape(28.dp))
                        .background(SassCard, RoundedCornerShape(28.dp))
                        .padding(24.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Text(text = "Task Operations Overview", color = SassTextPrimary, style = SassCardTitle)
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Open Tasks", color = SassTextSecondary, fontSize = 12.sp)
                                Text("$openTasksCount", color = SassWarning, style = SassLargeNumber)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Completed Tasks", color = SassTextSecondary, fontSize = 12.sp)
                                Text("$completedTasksCount", color = SassSuccess, style = SassLargeNumber)
                            }
                        }
                    }
                }
            }

            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(16.dp, RoundedCornerShape(28.dp))
                        .background(SassCard, RoundedCornerShape(28.dp))
                        .padding(24.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Text(text = "CRM Leads Status Pipeline", color = SassTextPrimary, style = SassCardTitle)
                        FintechChart(
                            points = listOf(15f, 25f, 20f, 35f, 30f, 45f, 50f),
                            modifier = Modifier.fillMaxWidth().height(160.dp)
                        )
                    }
                }
            }
        }
    }
}

// ---------------- ANNOUNCEMENTS OVERLAY SCREEN ----------------
@Composable
fun AnnouncementsOverlayScreen(
    data: JsonObject?,
    canBroadcast: Boolean,
    onClose: () -> Unit,
    onSubmitAnnouncement: (title: String, body: String, audienceRoles: String, priority: String) -> Unit
) {
    val announcements = remember(data) { data?.get("announcements")?.jsonArray ?: JsonArray(emptyList()) }
    var showBroadcastDialog by remember { mutableStateOf(false) }

    var annTitle by remember { mutableStateOf("") }
    var annBody by remember { mutableStateOf("") }
    var annPriority by remember { mutableStateOf("Medium") }
    var annAudience by remember { mutableStateOf("all") }

    Column(modifier = Modifier.fillMaxSize().background(SassBackground)) {
        Row(
            modifier = Modifier.fillMaxWidth().background(SassCard).padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onClose) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = SassTextPrimary)
            }
            Text(text = "Workspace Announcements", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.weight(1f))
            
            if (canBroadcast) {
                IconButton(onClick = {
                    annTitle = ""
                    annBody = ""
                    annPriority = "Medium"
                    annAudience = "all"
                    showBroadcastDialog = true
                }) {
                    Icon(Icons.Default.AddCircle, contentDescription = "Broadcast", tint = SassPrimary)
                }
            }
        }

        LazyColumn(
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.weight(1f).fillMaxWidth()
        ) {
            if (announcements.isEmpty()) {
                item {
                    Text("No announcements published yet.", color = SassTextSecondary, fontSize = 14.sp)
                }
            } else {
                items(announcements) { item ->
                    val obj = item.jsonObject
                    val title = obj["title"]?.jsonPrimitive?.contentOrNull ?: "Announcement"
                    val body = obj["body"]?.jsonPrimitive?.contentOrNull ?: ""
                    val date = obj["createdAt"]?.jsonPrimitive?.contentOrNull ?: ""

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(8.dp, RoundedCornerShape(24.dp))
                            .background(SassCard, RoundedCornerShape(24.dp))
                            .padding(20.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text(text = title, color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                Text(text = date.take(10), color = SassTextSecondary, fontSize = 11.sp)
                            }
                            Text(text = body, color = SassTextSecondary, fontSize = 13.sp)
                        }
                    }
                }
            }
        }
    }

    if (showBroadcastDialog && canBroadcast) {
        AlertDialog(
            onDismissRequest = { showBroadcastDialog = false },
            title = { Text(text = "Broadcast Announcement", style = SassCardTitle) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    PremiumTextField(value = annTitle, onValueChange = { annTitle = it }, label = "Title", placeholder = "e.g. Server Maintenance Notice")
                    PremiumTextField(value = annBody, onValueChange = { annBody = it }, label = "Message Body", placeholder = "Specify announcements description...")
                    PremiumTextField(value = annPriority, onValueChange = { annPriority = it }, label = "Priority (Low / Medium / High)", placeholder = "Medium")
                    PremiumTextField(value = annAudience, onValueChange = { annAudience = it }, label = "Audience Roles (e.g. all, employee, admin)", placeholder = "all")
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (annTitle.isNotBlank() && annBody.isNotBlank()) {
                            onSubmitAnnouncement(annTitle, annBody, annAudience, annPriority)
                            showBroadcastDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SassPrimary),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Broadcast", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showBroadcastDialog = false }) {
                    Text("Cancel", color = SassTextSecondary)
                }
            },
            containerColor = SassCard,
            shape = RoundedCornerShape(28.dp)
        )
    }
}

// ---------------- MEETINGS OVERLAY SCREEN ----------------
@Composable
fun MeetingsOverlayScreen(
    data: JsonObject?,
    canScheduleMeetings: Boolean,
    onClose: () -> Unit,
    onSubmitMeeting: (title: String, start: String, end: String, url: String, roles: String, users: String, notes: String) -> Unit
) {
    val meetings = remember(data) { data?.get("meetings")?.jsonArray ?: JsonArray(emptyList()) }
    var showScheduleDialog by remember { mutableStateOf(false) }

    var title by remember { mutableStateOf("") }
    var start by remember { mutableStateOf("") }
    var end by remember { mutableStateOf("") }
    var url by remember { mutableStateOf("") }
    var audienceRoles by remember { mutableStateOf("all") }
    var audienceUsers by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    val context = LocalContext.current

    Column(modifier = Modifier.fillMaxSize().background(SassBackground)) {
        Row(
            modifier = Modifier.fillMaxWidth().background(SassCard).padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onClose) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = SassTextPrimary)
            }
            Text(text = "Scheduled Meetings", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.weight(1f))
            
            if (canScheduleMeetings) {
                IconButton(onClick = { showScheduleDialog = true }) {
                    Icon(Icons.Default.AddCircle, contentDescription = "Schedule Meet", tint = SassPrimary)
                }
            }
        }

        LazyColumn(
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.weight(1f).fillMaxWidth()
        ) {
            if (meetings.isEmpty()) {
                item {
                    Text("No scheduled meetings found.", color = SassTextSecondary, fontSize = 14.sp)
                }
            } else {
                items(meetings) { meetItem ->
                    val obj = meetItem.jsonObject
                    val meetTitle = obj["title"]?.jsonPrimitive?.contentOrNull ?: "Meeting"
                    val meetStart = obj["startsAt"]?.jsonPrimitive?.contentOrNull ?: ""
                    val meetUrl = obj["meetUrl"]?.jsonPrimitive?.contentOrNull ?: ""
                    val meetNotes = obj["notes"]?.jsonPrimitive?.contentOrNull ?: ""

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(8.dp, RoundedCornerShape(24.dp))
                            .background(SassCard, RoundedCornerShape(24.dp))
                            .padding(20.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Column {
                                    Text(text = meetTitle, color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    Text(text = "Starts: ${meetStart.take(16).replace("T", " ")}", color = SassTextSecondary, fontSize = 12.sp)
                                }
                            }
                            if (meetNotes.isNotEmpty()) {
                                Text(text = meetNotes, color = SassTextSecondary, fontSize = 13.sp)
                            }
                            
                            if (meetUrl.isNotEmpty()) {
                                Button(
                                    onClick = {
                                        try {
                                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(meetUrl))
                                            context.startActivity(intent)
                                        } catch (e: Exception) {
                                            Toast.makeText(context, "Could not open URL link", Toast.LENGTH_SHORT).show()
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = SassPrimary),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("JOIN MEETING ROOM", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showScheduleDialog) {
        AlertDialog(
            onDismissRequest = { showScheduleDialog = false },
            title = { Text("Schedule Meeting", style = SassCardTitle, color = SassTextPrimary) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    PremiumTextField(value = title, onValueChange = { title = it }, label = "Title", placeholder = "Standup / Sync")
                    PremiumTextField(value = start, onValueChange = { start = it }, label = "Start Time (YYYY-MM-DD HH:MM)", placeholder = "2026-06-12 10:00")
                    PremiumTextField(value = end, onValueChange = { end = it }, label = "End Time (YYYY-MM-DD HH:MM)", placeholder = "2026-06-12 11:00")
                    PremiumTextField(value = url, onValueChange = { url = it }, label = "Google Meet Link", placeholder = "https://meet.google.com/...")
                    PremiumTextField(value = audienceRoles, onValueChange = { audienceRoles = it }, label = "Audience Roles", placeholder = "all, employee, admin, or sales")
                    PremiumTextField(value = audienceUsers, onValueChange = { audienceUsers = it }, label = "Audience Specific User IDs (Optional comma-separated)", placeholder = "e.g. 1, 2")
                    PremiumTextField(value = notes, onValueChange = { notes = it }, label = "Agenda / Notes", placeholder = "Write agenda items...")
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (title.isNotEmpty() && start.isNotEmpty() && end.isNotEmpty()) {
                            val cleanStart = start.replace(" ", "T") + ":00Z"
                            val cleanEnd = end.replace(" ", "T") + ":00Z"
                            onSubmitMeeting(title, cleanStart, cleanEnd, url, audienceRoles, audienceUsers, notes)
                            showScheduleDialog = false
                            title = ""
                            start = ""
                            end = ""
                            url = ""
                            audienceRoles = "all"
                            audienceUsers = ""
                            notes = ""
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SassPrimary),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Save Meeting", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showScheduleDialog = false }) {
                    Text("Cancel", color = SassTextSecondary)
                }
            },
            containerColor = SassCard,
            shape = RoundedCornerShape(28.dp)
        )
    }
}

// ---------------- RESOURCES OVERLAY SCREEN ----------------
@Composable
fun ResourcesOverlayScreen(
    data: JsonObject?,
    canManageResources: Boolean,
    onClose: () -> Unit,
    onSubmitResource: (title: String, resType: String, url: String, desc: String, roles: String, users: String, tags: String) -> Unit
) {
    val resources = remember(data) { data?.get("resources")?.jsonArray ?: JsonArray(emptyList()) }
    var showAddDialog by remember { mutableStateOf(false) }

    var title by remember { mutableStateOf("") }
    var resType by remember { mutableStateOf("PDF") }
    var url by remember { mutableStateOf("") }
    var desc by remember { mutableStateOf("") }
    var audienceRoles by remember { mutableStateOf("all") }
    var audienceUsers by remember { mutableStateOf("") }
    var tags by remember { mutableStateOf("") }

    val context = LocalContext.current

    Column(modifier = Modifier.fillMaxSize().background(SassBackground)) {
        Row(
            modifier = Modifier.fillMaxWidth().background(SassCard).padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onClose) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = SassTextPrimary)
            }
            Text(text = "Learning Resources Hub", color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.weight(1f))
            
            if (canManageResources) {
                IconButton(onClick = { showAddDialog = true }) {
                    Icon(Icons.Default.AddCircle, contentDescription = "Publish Resource", tint = SassPrimary)
                }
            }
        }

        LazyColumn(
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.weight(1f).fillMaxWidth()
        ) {
            if (resources.isEmpty()) {
                item {
                    Text("No resources uploaded.", color = SassTextSecondary, fontSize = 14.sp)
                }
            } else {
                items(resources) { item ->
                    val obj = item.jsonObject
                    val resTitle = obj["title"]?.jsonPrimitive?.contentOrNull ?: "Resource"
                    val type = obj["resourceType"]?.jsonPrimitive?.contentOrNull ?: "Link"
                    val resUrl = obj["url"]?.jsonPrimitive?.contentOrNull ?: ""
                    val description = obj["description"]?.jsonPrimitive?.contentOrNull ?: ""

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(8.dp, RoundedCornerShape(24.dp))
                            .background(SassCard, RoundedCornerShape(24.dp))
                            .padding(20.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text(text = resTitle, color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                Text(text = type, color = SassSecondary, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                            }
                            if (description.isNotEmpty()) {
                                Text(text = description, color = SassTextSecondary, fontSize = 13.sp)
                            }
                            if (resUrl.isNotEmpty()) {
                                TextButton(
                                    onClick = {
                                        try {
                                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(resUrl))
                                            context.startActivity(intent)
                                        } catch (e: Exception) {
                                            Toast.makeText(context, "Could not open URL", Toast.LENGTH_SHORT).show()
                                        }
                                    },
                                    modifier = Modifier.align(Alignment.End)
                                ) {
                                    Text("Open Link ↗", color = SassPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAddDialog) {
        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = { Text("Publish New Resource", style = SassCardTitle, color = SassTextPrimary) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    PremiumTextField(value = title, onValueChange = { title = it }, label = "Title", placeholder = "SOP Guide / Training Manual")
                    PremiumTextField(value = resType, onValueChange = { resType = it }, label = "Resource Type (PDF, Video, Link)", placeholder = "PDF")
                    PremiumTextField(value = url, onValueChange = { url = it }, label = "Resource Link URL", placeholder = "https://drive.google.com/...")
                    PremiumTextField(value = audienceRoles, onValueChange = { audienceRoles = it }, label = "Audience Roles", placeholder = "all, employee, admin, or sales")
                    PremiumTextField(value = audienceUsers, onValueChange = { audienceUsers = it }, label = "Audience Specific User IDs (Optional)", placeholder = "e.g. 1, 2")
                    PremiumTextField(value = tags, onValueChange = { tags = it }, label = "Tags (Optional)", placeholder = "e.g. training, sop")
                    PremiumTextField(value = desc, onValueChange = { desc = it }, label = "Description", placeholder = "Explain what this guide covers")
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (title.isNotEmpty() && url.isNotEmpty()) {
                            onSubmitResource(title, resType, url, desc, audienceRoles, audienceUsers, tags)
                            showAddDialog = false
                            title = ""
                            resType = "PDF"
                            url = ""
                            desc = ""
                            audienceRoles = "all"
                            audienceUsers = ""
                            tags = ""
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SassPrimary),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Publish", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddDialog = false }) {
                    Text("Cancel", color = SassTextSecondary)
                }
            },
            containerColor = SassCard,
            shape = RoundedCornerShape(28.dp)
        )
    }
}

// ---------------- PRIVILEGES OVERLAY SCREEN ----------------
@Composable
fun PrivilegesOverlayScreen(
    data: JsonObject?,
    canManageAccess: Boolean,
    onClose: () -> Unit,
    onSubmitRoleDefinition: (key: String, label: String, desc: String, permissions: String, dashType: String, status: String, features: String) -> Unit
) {
    val roleDefinitions = remember(data) { data?.get("roleDefinitions")?.jsonArray ?: JsonArray(emptyList()) }
    var selectedRole by remember { mutableStateOf<JsonObject?>(null) }
    
    var label by remember { mutableStateOf("") }
    var desc by remember { mutableStateOf("") }
    var permissions by remember { mutableStateOf("") }
    var dashType by remember { mutableStateOf("workspace") }
    var status by remember { mutableStateOf("Active") }
    val mappedFeatures = remember { mutableStateMapOf<String, Boolean>() }

    val portalFeaturesList = listOf(
        "employees" to "View/manage employees database",
        "access" to "Manage privileges and authorization matrices",
        "applicants" to "Manage applicants profile pipelines",
        "announcements" to "Publish announcements",
        "meetings" to "Schedule meetings",
        "crm" to "Use CRM database",
        "crm_manage" to "Manage CRM sheets upload/permissions",
        "resources" to "Publish resources and documents",
        "chat" to "Access group chat support",
        "ops" to "Work ops and check-ins",
        "expenses" to "Manage expense claims",
        "payroll" to "Manage payroll inputs",
        "reviews" to "Perform reviews and assessments",
        "documents" to "View/sign corporate documents"
    )

    Column(modifier = Modifier.fillMaxSize().background(SassBackground)) {
        Row(
            modifier = Modifier.fillMaxWidth().background(SassCard).padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onClose) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = SassTextPrimary)
            }
            Text(
                text = if (selectedRole == null) "Granular Mapped Privileges" else "Edit privileges: ${selectedRole?.get("label")?.jsonPrimitive?.contentOrNull}",
                color = SassTextPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                modifier = Modifier.weight(1f)
            )
            if (selectedRole != null) {
                TextButton(onClick = { selectedRole = null }) {
                    Text("Close Panel", color = SassPrimary, fontWeight = FontWeight.Bold)
                }
            }
        }

        if (selectedRole == null) {
            LazyColumn(
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.weight(1f).fillMaxWidth()
            ) {
                item {
                    Text("Workspace Roles Directory", style = SassSectionTitle, color = SassTextPrimary)
                }
                
                items(roleDefinitions) { roleItem ->
                    val obj = roleItem.jsonObject
                    val rKey = obj["key"]?.jsonPrimitive?.contentOrNull ?: ""
                    val rLabel = obj["label"]?.jsonPrimitive?.contentOrNull ?: ""
                    val rDesc = obj["description"]?.jsonPrimitive?.contentOrNull ?: ""
                    val fAccess = obj["featureAccess"]?.jsonPrimitive?.contentOrNull ?: ""
                    val totalFeatures = portalFeaturesList.size
                    val mappedCount = if (rKey == "super_admin") totalFeatures else fAccess.split(",").filter { it.isNotEmpty() }.size

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(8.dp, RoundedCornerShape(28.dp))
                            .background(SassCard, RoundedCornerShape(28.dp))
                            .clickable {
                                if (canManageAccess && rKey != "super_admin") {
                                    selectedRole = obj
                                    label = rLabel
                                    desc = rDesc
                                    permissions = obj["permissions"]?.jsonPrimitive?.contentOrNull ?: ""
                                    dashType = obj["dashboardType"]?.jsonPrimitive?.contentOrNull ?: "workspace"
                                    status = obj["status"]?.jsonPrimitive?.contentOrNull ?: "Active"
                                    mappedFeatures.clear()
                                    portalFeaturesList.forEach { (fid, _) ->
                                        mappedFeatures[fid] = fAccess.split(",").contains(fid)
                                    }
                                }
                            }
                            .padding(20.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text(text = rLabel, color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                Text(text = rKey, color = SassSecondary, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                            }
                            Text(text = rDesc, color = SassTextSecondary, fontSize = 13.sp)
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text(text = "$mappedCount / $totalFeatures privileges mapped", color = SassPrimary, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                                if (canManageAccess && rKey != "super_admin") {
                                    Text(text = "Tap to configure ⚙️", color = SassPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
                modifier = Modifier.weight(1f).fillMaxWidth()
            ) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        PremiumTextField(value = desc, onValueChange = { desc = it }, label = "Description", placeholder = "Role purpose...")
                        PremiumTextField(value = permissions, onValueChange = { permissions = it }, label = "Access limitations notes", placeholder = "Optional notes...")
                        
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Dashboard Type:", color = SassTextSecondary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                            Text(
                                text = if (dashType == "superior") "Superior Dashboard" else "Workspace Dashboard",
                                color = SassPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                modifier = Modifier
                                    .clickable { dashType = if (dashType == "superior") "workspace" else "superior" }
                                    .background(Color(0xFFEFF6FF), RoundedCornerShape(8.dp))
                                    .padding(horizontal = 12.dp, vertical = 6.dp)
                            )
                        }

                        Text("Authorization Privilege Mappings", style = SassSectionTitle, color = SassTextPrimary)
                    }
                }

                items(portalFeaturesList) { (fId, fDesc) ->
                    val isChecked = mappedFeatures[fId] ?: false
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(4.dp, RoundedCornerShape(20.dp))
                            .background(SassCard, RoundedCornerShape(20.dp))
                            .clickable { mappedFeatures[fId] = !isChecked }
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(text = fId.replace("_", " ").uppercase(Locale.US), color = SassTextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(text = fDesc, color = SassTextSecondary, fontSize = 12.sp)
                        }
                        Checkbox(
                            checked = isChecked,
                            onCheckedChange = { mappedFeatures[fId] = it },
                            colors = CheckboxDefaults.colors(checkedColor = SassPrimary)
                        )
                    }
                }

                item {
                    Button(
                        onClick = {
                            val fList = mappedFeatures.filter { it.value }.keys.joinToString(",")
                            val rKey = selectedRole?.get("key")?.jsonPrimitive?.contentOrNull ?: ""
                            onSubmitRoleDefinition(rKey, label, desc, permissions, dashType, status, fList)
                            selectedRole = null
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = SassPrimary),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth().height(50.dp)
                    ) {
                        Text("Update Role Privileges", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
