from controller import Robot
import csv

# 1. Inicialización
robot = Robot()
TIME_STEP = int(robot.getBasicTimeStep())

motor_izquierdo = robot.getDevice('left wheel motor')
motor_derecho = robot.getDevice('right wheel motor')
motor_izquierdo.setPosition(float('inf'))
motor_derecho.setPosition(float('inf'))
motor_izquierdo.setVelocity(0.0)
motor_derecho.setVelocity(0.0)

sensor_frontal_izq = robot.getDevice('ps7')  
sensor_frontal_der = robot.getDevice('ps0')
sensor_lateral_izq = robot.getDevice('ps5')
sensor_lateral_der = robot.getDevice('ps2')

sensor_frontal_izq.enable(TIME_STEP)
sensor_frontal_der.enable(TIME_STEP)
sensor_lateral_izq.enable(TIME_STEP)
sensor_lateral_der.enable(TIME_STEP)

encoder_izquierdo = robot.getDevice('left wheel sensor')
encoder_derecho = robot.getDevice('right wheel sensor')
encoder_izquierdo.enable(TIME_STEP)
encoder_derecho.enable(TIME_STEP)

# --- VARIABLES GLOBALES ---
RADIO_RUEDA = 0.0205 
pos_izq_ant = 0.0
pos_der_ant = 0.0
VENTANA = 5
buffer_mediciones = []

d_estimada = 0.08  
P = 1.0            
R = 0.05           
Q = 0.001          
VELOCIDAD_MAX = 3.14

contador_giro = 0
# NUEVA VARIABLE: Memoria de dirección (1 = derecha, -1 = izquierda)
direccion_giro = 1 

# Preparación del CSV
archivo_csv = open('datos_escenario2.csv', mode='w', newline='')
writer = csv.writer(archivo_csv)
writer.writerow(['Tiempo_s', 'Cruda_m', 'Filtrada_m', 'Kalman_m'])
tiempo_simulacion = 0.0

# 6. Ciclo Principal
while robot.step(TIME_STEP) != -1:
    
    # --- 1. ESTIMACIÓN DE AVANCE (ENCODERS) ---
    pos_izq_act = encoder_izquierdo.getValue()
    pos_der_act = encoder_derecho.getValue()
    
    delta_theta_izq = pos_izq_act - pos_izq_ant
    delta_theta_der = pos_der_act - pos_der_ant
    
    avance_izq = RADIO_RUEDA * delta_theta_izq
    avance_der = RADIO_RUEDA * delta_theta_der
    avance_lineal = (avance_izq + avance_der) / 2.0
    
    pos_izq_ant = pos_izq_act
    pos_der_ant = pos_der_act

    # --- 2. LECTURA Y FILTRO SIMPLE ---
    lectura_cruda_izq = sensor_frontal_izq.getValue()
    lectura_cruda_der = sensor_frontal_der.getValue()
    promedio_crudo = (lectura_cruda_izq + lectura_cruda_der) / 2.0
    
    # Sensibilidad extrema a las sombras (divisor en 300)
    crudo_sin_ruido = max(0.0, promedio_crudo - 65.0)
    z_k = 0.08 - (crudo_sin_ruido / 300.0) * 0.08
    z_k = max(0.0, min(0.08, z_k)) 
    
    buffer_mediciones.append(z_k)
    if len(buffer_mediciones) > VENTANA:
        buffer_mediciones.pop(0)
    z_filtrada = sum(buffer_mediciones) / len(buffer_mediciones)

    # --- 3. FILTRO DE KALMAN ---
    delta_d_k = -avance_lineal 
    d_predicha_menos = d_estimada + delta_d_k
    P_menos = P + Q
    
    K_k = P_menos / (P_menos + R)
    d_estimada = d_predicha_menos + K_k * (z_k - d_predicha_menos)
    P = (1 - K_k) * P_menos

    # --- 4. NAVEGACIÓN REACTIVA ---
    UMBRAL_SEGURIDAD = 0.06  
    
    # Periodo de gracia para ignorar la "basura" inicial de los sensores
    if tiempo_simulacion < 0.5:
        motor_izquierdo.setVelocity(VELOCIDAD_MAX)
        motor_derecho.setVelocity(VELOCIDAD_MAX)
    else:
        # Lógica de evasión con MEMORIA
        if d_estimada < UMBRAL_SEGURIDAD and contador_giro == 0:
            contador_giro = 30  
            lat_izq = sensor_lateral_izq.getValue()
            lat_der = sensor_lateral_der.getValue()
            
            # Decide 1 sola vez y guarda en memoria. 
            # Cambiamos prioridad: Ahora dobla a la DERECHA por defecto.
            if lat_der > lat_izq + 50:
                direccion_giro = -1 # Izquierda
            else:
                direccion_giro = 1  # Derecha
        
        if contador_giro > 0:
            # Ejecuta el giro basado en la memoria
            if direccion_giro == 1:
                motor_izquierdo.setVelocity(VELOCIDAD_MAX)
                motor_derecho.setVelocity(-VELOCIDAD_MAX)
            else:
                motor_izquierdo.setVelocity(-VELOCIDAD_MAX)
                motor_derecho.setVelocity(VELOCIDAD_MAX)
                
            contador_giro -= 1
        else:
            motor_izquierdo.setVelocity(VELOCIDAD_MAX)
            motor_derecho.setVelocity(VELOCIDAD_MAX)
            
    # --- 5. EXPORTAR DATOS ---
    tiempo_simulacion += (TIME_STEP / 1000.0)
    writer.writerow([tiempo_simulacion, z_k, z_filtrada, d_estimada])
    
    print(f"Estado: {'GIRANDO' if contador_giro > 0 else 'AVANZANDO'} | Crudo: {promedio_crudo:.1f} | Kalman: {d_estimada:.3f}")