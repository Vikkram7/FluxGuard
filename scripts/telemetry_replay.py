"""
FluxGuard PMSM - Telemetry Replay & Ingestion Utility
Streams recorded CSV scenario data or synthetic hardware frames to the
Java Spring Boot backend via HTTP POST /api/telemetry or WebSocket.
"""

import sys
import os
import time
import argparse
import requests
import pandas as pd


def replay_file(file_path: str, backend_url: str = "http://localhost:8080/api/telemetry",
                rate_hz: float = 20.0, asset_id: int = 1, loop: bool = False):
    if not os.path.isfile(file_path):
        print(f"[-] File not found: {file_path}")
        return

    print(f"[*] Loading dataset: {file_path}")
    df = pd.read_csv(file_path)
    print(f"[*] Loaded {len(df)} samples. Replaying to {backend_url} at {rate_hz} Hz (Asset ID: {asset_id}) ...")

    interval = 1.0 / rate_hz

    while True:
        sent = 0
        for idx, row in df.iterrows():
            payload = {
                "assetId": asset_id,
                "timestampMs": int(row.get("timestamp_ms", time.time() * 1000)),
                "speedRpm": float(row.get("speed_rpm", 0.0)),
                "temperatureC": float(row.get("temperature_c", 25.0)),
                "idA": float(row.get("id_a", 0.0)),
                "iqA": float(row.get("iq_a", 0.0)),
                "vdV": float(row.get("vd_v", 0.0)),
                "vqV": float(row.get("vq_v", 0.0)),
                "estimatedFluxWb": float(row.get("estimated_flux_wb", 0.085)),
                "healthyReferenceFluxWb": float(row.get("healthy_reference_flux_wb", 0.085)),
                "residualPct": float(row.get("smoothed_residual_pct", row.get("norm_residual_pct", 0.0))),
                "diagnosticState": str(row.get("diagnostic_state", "NORMAL")),
                "reasonCode": str(row.get("reason_code", "REPLAY_STREAM")),
                "confidencePct": float(row.get("confidence_pct", 90.0)),
                "uncertainty": float(row.get("uncertainty", 0.1)),
                "isSimulated": True
            }

            try:
                resp = requests.post(backend_url, json=payload, timeout=2.0)
                if resp.status_code not in (200, 201):
                    print(f"[-] Backend returned status {resp.status_code}: {resp.text}")
                else:
                    sent += 1
                    if sent % 20 == 0:
                        print(f"  [>] Streamed {sent}/{len(df)} samples | State: {payload['diagnosticState']} | Res: {payload['residualPct']:.2f}%")
            except Exception as e:
                print(f"[-] Connection error to backend: {e}")
                time.sleep(1.0)

            time.sleep(interval)

        if not loop:
            break
        print("[*] Looping scenario replay...")

    print(f"[+] Replay completed. Sent {sent} samples.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FluxGuard Telemetry Replay Tool")
    parser.add_argument("--file", type=str, default="datasets/synthetic_flux_reduction_10pct.csv",
                        help="Path to CSV dataset")
    parser.add_argument("--url", type=str, default="http://localhost:8080/api/telemetry",
                        help="Backend ingestion endpoint")
    parser.add_argument("--rate", type=float, default=20.0, help="Replay rate in Hz")
    parser.add_argument("--asset", type=int, default=1, help="Target Motor Asset ID")
    parser.add_argument("--loop", action="store_true", help="Loop replay indefinitely")
    args = parser.parse_args()

    replay_file(args.file, args.url, args.rate, args.asset, args.loop)
