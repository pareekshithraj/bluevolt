package com.bluevolt.app

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import com.bluevolt.app.data.NetworkClient
import com.bluevolt.app.ui.login.LoginScreen
import com.bluevolt.app.ui.portal.PortalScreen
import com.bluevolt.app.ui.splash.SplashScreen

@Composable
fun MainNavigation() {
  val context = LocalContext.current
  val backStack = rememberNavBackStack(Splash)

  NavDisplay(
    backStack = backStack,
    onBack = { backStack.removeLastOrNull() },
    entryProvider =
      entryProvider {
        entry<Splash> {
          SplashScreen(
            onSplashFinished = {
              val hasToken = NetworkClient.getToken(context) != null
              backStack.removeLastOrNull()
              if (hasToken) {
                backStack.add(Portal)
              } else {
                backStack.add(Login)
              }
            },
            modifier = Modifier.fillMaxSize()
          )
        }
        entry<Login> {
          LoginScreen(
            onLoginSuccess = {
              // Clear current stack and navigate to Portal
              while (backStack.isNotEmpty()) {
                backStack.removeLastOrNull()
              }
              backStack.add(Portal)
            },
            modifier = Modifier.fillMaxSize()
          )
        }
        entry<Portal> {
          PortalScreen(
            onLogout = {
              NetworkClient.clearToken(context)
              // Clear current stack and navigate to Login
              while (backStack.isNotEmpty()) {
                backStack.removeLastOrNull()
              }
              backStack.add(Login)
            },
            modifier = Modifier.fillMaxSize()
          )
        }
      },
  )
}
