package com.example.network

import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

object HmacUtils {
    fun generateHmacSha256(secret: String, data: String): String {
        try {
            val secretKey = SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256")
            val mac = Mac.getInstance("HmacSHA256")
            mac.init(secretKey)
            val hmacBytes = mac.doFinal(data.toByteArray(Charsets.UTF_8))
            return hmacBytes.joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            e.printStackTrace()
            return ""
        }
    }
}
