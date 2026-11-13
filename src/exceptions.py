# Exceptions
class BaseProjectException(Exception):
    """Clase base para todas las excepciones del proyecto Teacher Analytics."""
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class ConfigFileNotFoundError(BaseProjectException):
    """Se lanza cuando el archivo de configuración (YAML) no existe."""
    pass


class SourceKeyNotFoundError(BaseProjectException):
    """Se lanza cuando se solicita una clave (ej: BASE_2026) que no está en el config."""
    pass


class PhysicalDataFileNotFoundError(BaseProjectException):
    """Se lanza cuando el archivo Excel definido no existe en la carpeta data/."""
    pass


class MappingFileNotFoundError(BaseProjectException):
    """Se lanza cuando el archivo de configuración de mapeo de columnas (YAML) no existe."""
    pass


class InvalidMappingFileError(BaseProjectException):
    """Se lanza cuando el archivo de mapeo de columnas es inválido o no contiene datos."""
    pass


class MissingMappingYearError(BaseProjectException):
    """Se lanza cuando se intenta procesar un año de origen que no tiene mapeo definido en el archivo YAML."""
    pass


class DatabaseLoadError(BaseProjectException):
    """Se lanza cuando ocurre un error grave al intentar cargar un DataFrame a la base de datos PostgreSQL."""
    pass


class DBTExecutionError(BaseProjectException):
    """Excepción lanzada cuando falla de forma imprevista la ejecución o compilación de un modelo de dbt."""
    pass


class TotalesNoCuadranError(BaseProjectException):
    """Se lanza cuando las filas leídas del Excel no coinciden con las filas cargadas en raw. La carga se deshace."""
    pass