/**
 * @file stm32g4_hal_stubs.h
 * @brief FluxGuard PMSM - STM32G4 Hardware Abstraction Layer Interface
 * 
 * Provides hardware interfaces for ADC (current/voltage), TIM (encoder & PWM),
 * USART (telemetry), and IWDG (watchdog). Uses HAL on target hardware and
 * software mocks on desktop hosts.
 */

#ifndef STM32G4_HAL_STUBS_H
#define STM32G4_HAL_STUBS_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Hardware abstraction handles */
typedef struct {
    uint16_t adc1_dma_buffer[4]; /* [Ia, Ib, Vbus, Temp] */
    uint32_t encoder_timer_val;
    bool watchdog_active;
    bool uart_tx_busy;
} STM32G4_Hardware_t;

void HAL_Driver_Init(STM32G4_Hardware_t *hw);
void HAL_Driver_StartADC_DMA(STM32G4_Hardware_t *hw);
void HAL_Driver_StartEncoder(STM32G4_Hardware_t *hw);
void HAL_Driver_TransmitUART_DMA(STM32G4_Hardware_t *hw, const uint8_t *data, uint16_t length);
void HAL_Driver_KickWatchdog(STM32G4_Hardware_t *hw);
uint32_t HAL_Driver_GetTick(void);

#ifdef __cplusplus
}
#endif

#endif /* STM32G4_HAL_STUBS_H */
