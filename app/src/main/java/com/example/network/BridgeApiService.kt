package com.example.network

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import java.util.UUID

data class BridgeNotifyRequest(
    val provider: String,
    val raw_text: String,
    val received_at: Long,
    val sender: String
)

data class BridgeNotifyResponse(
    val success: Boolean,
    val message: String? = null,
    val matched: Boolean? = null
)

data class HeartbeatRequest(
    val battery_pct: Int,
    val app_version: String,
    val network_type: String
)

data class HeartbeatResponse(
    val status: String
)

data class BridgeConfigResponse(
    val allowed_packages: List<String>,
    val allowed_senders: List<String>,
    val keywords: List<String>
)

interface BridgeApi {
    @POST("bridge/notify")
    suspend fun notifyTransaction(@Body request: BridgeNotifyRequest): BridgeNotifyResponse

    @POST("bridge/heartbeat")
    suspend fun sendHeartbeat(@Body request: HeartbeatRequest): HeartbeatResponse

    @GET("bridge/config")
    suspend fun getConfig(): BridgeConfigResponse
}

class HmacInterceptor(
    private val deviceIdProvider: () -> String,
    private val deviceSecretProvider: () -> String
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val deviceId = deviceIdProvider()
        val deviceSecret = deviceSecretProvider()

        if (deviceId.isEmpty() || deviceSecret.isEmpty()) {
            return chain.proceed(originalRequest)
        }

        val timestamp = System.currentTimeMillis().toString()
        val nonce = UUID.randomUUID().toString()

        // Read request body if present
        val requestBody = originalRequest.body
        val buffer = okio.Buffer()
        requestBody?.writeTo(buffer)
        val bodyString = buffer.readUtf8()

        val payloadToSign = timestamp + nonce + bodyString
        val signature = HmacUtils.generateHmacSha256(deviceSecret, payloadToSign)

        val newRequest = originalRequest.newBuilder()
            .header("X-Device-Id", deviceId)
            .header("X-Timestamp", timestamp)
            .header("X-Nonce", nonce)
            .header("X-Signature", signature)
            .build()

        return chain.proceed(newRequest)
    }
}

object RetrofitClient {
    private var retrofitInstance: Retrofit? = null
    private var currentBaseUrl: String = ""

    fun getApi(baseUrl: String, deviceIdProvider: () -> String, deviceSecretProvider: () -> String): BridgeApi {
        val normalizedUrl = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        if (retrofitInstance == null || currentBaseUrl != normalizedUrl) {
            currentBaseUrl = normalizedUrl
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            val client = OkHttpClient.Builder()
                .addInterceptor(HmacInterceptor(deviceIdProvider, deviceSecretProvider))
                .addInterceptor(logging)
                .build()

            retrofitInstance = Retrofit.Builder()
                .baseUrl(normalizedUrl)
                .client(client)
                .addConverterFactory(MoshiConverterFactory.create())
                .build()
        }
        return retrofitInstance!!.create(BridgeApi::class.java)
    }
}
