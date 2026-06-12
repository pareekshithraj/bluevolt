package com.bluevolt.app.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val SassColorScheme = lightColorScheme(
    primary = SassPrimary,
    onPrimary = Color.White,
    secondary = SassSecondary,
    onSecondary = Color.White,
    tertiary = SassAccent,
    background = SassBackground,
    onBackground = SassTextPrimary,
    surface = SassCard,
    onSurface = SassTextPrimary,
    error = SassDanger,
    onError = Color.White
)

@Composable
fun BlueVoltTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    // Disable dynamic colors to enforce the custom designed brand identity
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    // We enforce the light theme color scheme to maintain the light SaaS aesthetic
    MaterialTheme(
        colorScheme = SassColorScheme,
        typography = Typography,
        content = content
    )
}
