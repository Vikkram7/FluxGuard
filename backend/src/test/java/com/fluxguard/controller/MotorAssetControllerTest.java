package com.fluxguard.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluxguard.entity.MotorConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class MotorAssetControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    public void testGetAssetsAndDefaultInitialization() throws Exception {
        mockMvc.perform(get("/api/assets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].assetTag").value("PMSM-SPM-4P-01"));
    }

    @Test
    public void testGetAndPutConfiguration() throws Exception {
        // Fetch existing configuration
        mockMvc.perform(get("/api/assets/1/configuration"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.polePairs").value(4))
                .andExpect(jsonPath("$.data.referenceFluxWb").value(0.085));

        // Update configuration
        MotorConfiguration update = new MotorConfiguration();
        update.setPolePairs(4);
        update.setStatorResistanceRs(0.48);
        update.setdAxisInductanceLd(0.0036);
        update.setqAxisInductanceLq(0.0036);
        update.setReferenceFluxWb(0.085);
        update.setReferenceTemperatureC(25.0);
        update.setAlphaPsiPerK(-0.0011);
        update.setWarningThresholdPct(-3.5);
        update.setFaultThresholdPct(-5.0);
        update.setRecoveryThresholdPct(-2.8);
        update.setPersistenceDurationS(2.0);

        mockMvc.perform(put("/api/assets/1/configuration")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.statorResistanceRs").value(0.48))
                .andExpect(jsonPath("$.data.referenceTemperatureC").value(25.0));
    }

    @Test
    public void testRejectInvalidConfigurationParameters() throws Exception {
        // Test invalid positive alpha_psi
        MotorConfiguration invalid = new MotorConfiguration();
        invalid.setPolePairs(4);
        invalid.setStatorResistanceRs(0.45);
        invalid.setdAxisInductanceLd(0.0035);
        invalid.setqAxisInductanceLq(0.0035);
        invalid.setReferenceFluxWb(0.085);
        invalid.setAlphaPsiPerK(0.005); // Invalid! Must be negative

        mockMvc.perform(put("/api/assets/1/configuration")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
