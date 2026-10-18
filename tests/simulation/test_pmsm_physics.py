"""
FluxGuard PMSM - Physics & Motor Model Unit Tests
Tests mechanical/electrical speed conversions, torque calculations,
temperature-dependent flux equations, and parameter validations.
"""

import pytest
import numpy as np
from simulation.pmsm_model import PMSMParameters, PMSMSimulator


def test_parameter_validation():
    # Valid parameters should not raise
    params = PMSMParameters()
    params.validate()

    # Negative pole pairs
    with pytest.raises(ValueError, match="Pole pairs must be positive"):
        PMSMParameters(p=0).validate()

    # Negative resistance
    with pytest.raises(ValueError, match="Stator resistance must be positive"):
        PMSMParameters(Rs=-0.1).validate()

    # Positive alpha_psi (should be negative for rare earth magnets)
    with pytest.raises(ValueError, match="alpha_psi should be negative"):
        PMSMParameters(alpha_psi=0.001).validate()


def test_speed_conversion():
    params = PMSMParameters(p=4)
    sim = PMSMSimulator(params=params)

    # Set speed to 1500 RPM
    # omega_m = 1500 * 2 * pi / 60 = 50 * pi = 157.0796 rad/s
    sim.omega_m = 1500.0 * (2.0 * np.pi / 60.0)

    assert pytest.approx(sim.speed_rpm, rel=1e-5) == 1500.0
    assert pytest.approx(sim.omega_m, rel=1e-5) == 50.0 * np.pi

    # Electrical speed = p * omega_m = 4 * 157.0796 = 628.3185 rad/s
    assert pytest.approx(sim.omega_e, rel=1e-5) == 200.0 * np.pi
    assert pytest.approx(sim.omega_e / sim.omega_m, rel=1e-5) == 4.0


def test_torque_equation():
    params = PMSMParameters(p=4, Ld=0.0035, Lq=0.0035, psi_f_ref=0.085)
    sim = PMSMSimulator(params=params)

    # For SPMSM (Ld == Lq), reluctance torque is zero:
    # Te = 1.5 * p * psi_f * iq = 1.5 * 4 * 0.085 * 5.0 = 2.55 Nm
    torque = sim.compute_torque(i_d=0.0, i_q=5.0, psi=0.085)
    assert pytest.approx(torque, rel=1e-5) == 2.55

    # Reluctance torque verification with salient machine (IPMSM where Ld < Lq)
    params_salient = PMSMParameters(p=4, Ld=0.002, Lq=0.004, psi_f_ref=0.085)
    sim_salient = PMSMSimulator(params=params_salient)
    # id = -2A, iq = 5A
    # Te = 1.5 * 4 * [0.085 * 5 + (0.002 - 0.004) * (-2) * 5] = 6 * [0.425 + 0.02] = 2.67 Nm
    t_salient = sim_salient.compute_torque(i_d=-2.0, i_q=5.0, psi=0.085)
    assert pytest.approx(t_salient, rel=1e-5) == 2.67


def test_temperature_dependent_flux_physics():
    params = PMSMParameters(psi_f_ref=0.085, T_ref=20.0, alpha_psi=-0.0011)
    sim = PMSMSimulator(params=params)

    # At reference temperature (20 C), flux equals nominal
    sim.temperature = 20.0
    sim.demag_ratio = 0.0
    assert pytest.approx(sim.actual_flux(), rel=1e-6) == 0.085

    # Temperature rise to 80 C (delta T = 60 K):
    # factor = 1 + (-0.0011 * 60) = 1 - 0.066 = 0.934
    # flux = 0.085 * 0.934 = 0.07939 Wb (reversible decrease)
    sim.temperature = 80.0
    assert pytest.approx(sim.actual_flux(), rel=1e-6) == 0.085 * (1.0 - 0.0011 * 60.0)

    # Sub-zero temperature (0 C, delta T = -20 K): flux increases reversibly
    sim.temperature = 0.0
    assert pytest.approx(sim.actual_flux(), rel=1e-6) == 0.085 * (1.0 + 0.0011 * 20.0)

    # Synthetic permanent degradation (10% demagnetization):
    sim.temperature = 20.0
    sim.demag_ratio = 0.10
    assert pytest.approx(sim.actual_flux(), rel=1e-6) == 0.085 * 0.90
